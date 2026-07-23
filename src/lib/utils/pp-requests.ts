import type { FocusedPlaylist, Playlist } from "$lib/types/pp-responses";

// TODO: URL에서 host와 엔드포인트 분리.
const url = {
  playlistSlideThumb: (
    id: string,
    itemIndex: number,
    cueIndex: number,
    quality: number = 480,
  ): string =>
    [
      "http://localhost:50001/v1/playlist/",
      id,
      "/",
      itemIndex,
      "/thumbnail/",
      cueIndex,
      "?quality=",
      quality,
    ].join(""),
};

export async function getFocusedPlaylist(): Promise<FocusedPlaylist> {
  const response = await fetch("http://localhost:50001/v1/playlist/focused");

  await throwIfNotOk(response);

  return await response.json();
}

export async function getPlaylistSlideThumbUrl(
  id: string,
  itemIndex: number,
  cueIndex: number,
  quality: number = 480,
): Promise<string> {
  const requestUrl = url.playlistSlideThumb(id, itemIndex, cueIndex, 1);
  const response = await fetch(requestUrl);

  await throwIfNotOk(response);

  if ((await response.blob()).size <= 0) {
    throw new Error("Empty blob");
  }

  return url.playlistSlideThumb(id, itemIndex, cueIndex, quality);
}

export async function getPlaylistById(id: string): Promise<Playlist> {
  const requestUrl = `http://localhost:50001/v1/playlist/${id}`;
  const response = await fetch(requestUrl);

  await throwIfNotOk(response);

  return await response.json();
}

async function throwIfNotOk(response: Response) {
  if (!response.ok) {
    const statusMessage = `${response.status} ${response.statusText}`;
    const body = await response.text();

    throw new Error([statusMessage, body].join("\n"));
  }
}
