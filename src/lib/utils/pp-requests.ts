import type {
  PFocusedPlaylist,
  PLibrary,
  PObjectId,
  PPlaylist,
  PPlaylistAll,
  PPresentation,
} from "$lib/types/pp";

// TODO: URL에서 host와 엔드포인트 분리.

export async function getFocusedPlaylist(): Promise<PFocusedPlaylist> {
  return await request("http://localhost:50001/v1/playlist/focused");
}

export async function getPlaylistSlideThumbUrl(
  id: string,
  itemIndex: number,
  cueIndex: number,
  quality: number = 480,
): Promise<string> {
  return [
    "http://localhost:50001/v1/playlist/",
    id,
    "/",
    itemIndex,
    "/thumbnail/",
    cueIndex,
    "?quality=",
    quality,
  ].join("");
}

export async function getPlaylistById(id: string): Promise<PPlaylist> {
  return await request(`http://localhost:50001/v1/playlist/${id}`);
}

export async function getPresentationByUuid(
  uuid: string,
): Promise<{ presentation: PPresentation }> {
  return await request(`http://localhost:50001/v1/presentation/${uuid}`);
}

export async function getPlaylistAll(): Promise<PPlaylistAll> {
  return await request("http://localhost:50001/v1/playlists");
}

export async function getLibraryAll(): Promise<PObjectId[]> {
  return await request("http://localhost:50001/v1/libraries");
}

export async function getLibraryById(id: string): Promise<PLibrary> {
  return await request(`http://localhost:50001/v1/library/${id}`);
}

export async function request(url: RequestInfo | URL) {
  const response = await fetch(url);

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(
      `${response.status} ${response.statusText}\n${await response.text()}`,
    );
  }
}
