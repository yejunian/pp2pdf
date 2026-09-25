import type {
  PFocusedPlaylist,
  PLibrary,
  PObjectId,
  PPlaylist,
  PPlaylistAll,
  PPresentation,
} from "$lib/types/pp";
import { isNotNullObject } from "$lib/types/utils";

/**
 * 사용자가 입력한 주소와 포트로 API 서버의 기준 URL(`http://host:port`)을 만든다.
 * 주소 앞의 `http://`와 뒤의 `/`는 있어도 없어도 된다.
 */
export function makeBaseUrl(host: string, port: number | string): string {
  const normalizedHost = host
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return `http://${normalizedHost}:${String(port).trim()}`;
}

export async function getFocusedPlaylist(
  baseUrl: string,
): Promise<PFocusedPlaylist> {
  return await request(`${baseUrl}/v1/playlist/focused`);
}

export async function getFocusedPresentation(
  baseUrl: string,
): Promise<PObjectId | null> {
  const response: unknown = await request(`${baseUrl}/v1/presentation/focused`);
  return findObjectId(response);
}

export function getPlaylistSlideThumbUrl(
  baseUrl: string,
  id: string,
  itemIndex: number,
  cueIndex: number,
  quality: number = 480,
): string {
  return `${baseUrl}/v1/playlist/${id}/${itemIndex}/thumbnail/${cueIndex}?quality=${quality}`;
}

export function getPresentationSlideThumbUrl(
  baseUrl: string,
  uuid: string,
  cueIndex: number,
  quality: number = 480,
): string {
  return `${baseUrl}/v1/presentation/${uuid}/thumbnail/${cueIndex}?quality=${quality}`;
}

export async function getPlaylistById(
  baseUrl: string,
  id: string,
  signal?: AbortSignal,
): Promise<PPlaylist> {
  return await request(`${baseUrl}/v1/playlist/${id}`, signal);
}

export async function getPresentationByUuid(
  baseUrl: string,
  uuid: string,
  signal?: AbortSignal,
): Promise<{ presentation: PPresentation }> {
  return await request(`${baseUrl}/v1/presentation/${uuid}`, signal);
}

export async function getPlaylistAll(baseUrl: string): Promise<PPlaylistAll> {
  return await request(`${baseUrl}/v1/playlists`);
}

export async function getLibraryAll(baseUrl: string): Promise<PObjectId[]> {
  return await request(`${baseUrl}/v1/libraries`);
}

export async function getLibraryById(
  baseUrl: string,
  id: string,
): Promise<PLibrary> {
  return await request(`${baseUrl}/v1/library/${id}`);
}

export async function request(url: RequestInfo | URL, signal?: AbortSignal) {
  const response = await fetch(url, { signal });

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(
      `${response.status} ${response.statusText}\n${await response.text()}`,
    );
  }
}

// 응답 형태가 버전마다 다를 수 있으므로 `PObjectId` 자체이거나
// `id` 또는 `presentation.id`로 감싼 형태를 모두 받아들인다.
function findObjectId(value: unknown): PObjectId | null {
  if (!isNotNullObject(value)) {
    return null;
  }

  if (typeof value.uuid === "string" && value.uuid) {
    return {
      uuid: value.uuid,
      name: typeof value.name === "string" ? value.name : "",
      index: typeof value.index === "number" ? value.index : 0,
    };
  }

  return findObjectId(value.id) ?? findObjectId(value.presentation);
}
