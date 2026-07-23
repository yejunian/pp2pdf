<script lang="ts">
  import type { Playlist } from "$lib/types/pp-responses";
  import {
    getFocusedPlaylist,
    getPlaylistById,
    getPlaylistSlideThumbUrl,
    getPresentationByUuid,
  } from "$lib/utils/pp-requests";

  const focusedPlaylistURL = "http://localhost:50001/v1/playlist/focused";

  let playlistState: Playlist | undefined = $state(); // XXX
  let thumbs: string[] = $state([]);

  async function handleButtonClick() {
    const focusedPlaylist = await getFocusedPlaylist();

    if (!focusedPlaylist.playlist) {
      // TODO: 재생목록 대신 단일 프레젠테이션이 선택된 경우
      // 해당 프레젠테이션의 섬네일 추출
      return;
    }

    const playlistId = focusedPlaylist.playlist.uuid;
    const playlist = await getPlaylistById(playlistId);
    playlistState = playlist; // XXX

    for (const item of playlist.items) {
      // TODO: 재생목록 루프 돌면서 부가정보(프레젠테이션별 길이 등)를
      // 기록해야 할 수도 있음.

      if (item.type !== "presentation") {
        // TODO: 헤더, 연결하지 않은 플레이스홀더 처리
        continue;
      }

      const presentationUuid = item.presentation_info.presentation_uuid;
      const arrangementUuid = item.presentation_info.arrangement_uuid;
      const index = item.id.index;

      const { presentation } = await getPresentationByUuid(presentationUuid);

      const total_cues = arrangementUuid
        ? (presentation.arrangements.find(
            (arrangement) => arrangement.id.uuid === arrangementUuid,
          )?.total_cues ?? 0)
        : presentation.total_cues;

      for (let c = 0; c < total_cues; c += 1) {
        thumbs.push(await getPlaylistSlideThumbUrl(playlistId, index, c, 192));
      }
    }
  }
</script>

<h1>pp2pdf</h1>

<div>
  <button type="button" onclick={handleButtonClick}>
    Fetch Current Playlist
    <br />
    {focusedPlaylistURL}
  </button>
</div>

{#if playlistState}
  <h2>{playlistState.id.name} <code>{playlistState.id.uuid}</code></h2>
  <ol>
    {#each playlistState.items as item, index (item.id.uuid)}
      <li>{index}. {item.id.name}</li>
    {/each}
  </ol>
{/if}

{#if thumbs.length > 0}
  <div>{thumbs.length}개 이미지</div>
  <div class="flex flex-wrap gap-x-2 gap-y-6">
    {#each thumbs as src, index (src)}
      <img {src} alt="{index + 1}번째" />
    {/each}
  </div>
{/if}
