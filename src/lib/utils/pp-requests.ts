import type { PFocusedPlaylist, PPlaylist, PPresentation } from "$lib/types/pp";

// TODO: URL에서 host와 엔드포인트 분리.

export async function getFocusedPlaylist(): Promise<PFocusedPlaylist> {
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
  const response = await fetch(`http://localhost:50001/v1/playlist/${id}`);

  await throwIfNotOk(response);

  return await response.json();
}

export async function getPresentationByUuid(
  uuid: string,
): Promise<{ presentation: PPresentation }> {
  const response = await fetch(
    `http://localhost:50001/v1/presentation/${uuid}`,
  );

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
