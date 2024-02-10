import { gzip } from 'pako';
import MIMEType from 'whatwg-mimetype';
import { bytebinUrl, postUrl } from './constants';
import { languageIds } from './highlighting';

interface LoadResultSuccess {
  ok: true;
  content: string;
  type?: string;
}

interface LoadResultFail {
  ok: false;
  content?: never;
  type?: never;
}

export type LoadResult = LoadResultSuccess | LoadResultFail;

let devtoolsNotificationShown = false;

export async function loadFromBytebin(id: string): Promise<LoadResult> {
  try {
    const resp = await fetch(bytebinUrl + id);
    if (resp.ok) {
      const content = await resp.text();
      const type = contentTypeToLanguage(
        resp.headers.get('content-type') as string
      );

      let hasJSON = false;
      (window as unknown as { text: unknown }).text = content;

      if (type === 'json') {
        try {
          (window as unknown as { json: unknown }).json = JSON.parse(content);
          hasJSON = true;
        } catch {}
      }

      if (!devtoolsNotificationShown) {
        console.log(
          `%cYou can access this paste's content by %cwindow.text`,
          'color: #4757ff;',
          'color: #ffca38;'
        );
        if (hasJSON) {
          console.log(
            `%cThis paste is json, and you can access this by %cwindow.json`,
            'color: #4757ff;',
            'color: #ffca38;'
          );
        }
        devtoolsNotificationShown = true;
      }

      document.title = 'pastes | ' + id;
      return { ok: true, content, type };
    } else {
      return { ok: false };
    }
  } catch (e) {
    return { ok: false };
  }
}

export async function saveToBytebin(
  code: string,
  language: string
): Promise<string | null> {
  try {
    const compressed = gzip(code);
    const contentType = languageToContentType(language);

    const resp = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Accept': 'application/json',
      },
      body: compressed,
    });

    if (resp.ok) {
      const json = await resp.json();
      return json.key;
    }
  } catch (e) {
    console.log(e);
  }
  return null;
}

export function contentTypeToLanguage(contentType: string) {
  const { type, subtype: subType } = new MIMEType(contentType);
  if (type === 'application' && subType === 'json') {
    return 'json';
  }
  if (type === 'text' && languageIds.includes(subType.toLowerCase())) {
    return subType.toLowerCase();
  }
}

export function languageToContentType(language: string) {
  if (language === 'json') {
    return 'application/json';
  } else {
    return 'text/' + language;
  }
}
