<script lang="ts">
  import type { Playlist } from "$lib/types/pp-responses";
  import {
    getFocusedPlaylist,
    getPlaylistById,
    getPlaylistSlideThumbUrl,
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
      if (item.type !== "presentation") {
        continue;
      }

      const index = item.id.index;

      // TODO: 크기 1짜리 섬네일 요청 시도 없이, 개별 프레젠테이션의
      // 해당 정렬의 길이 기반으로 루프 횟수를 제한하기.
      try {
        let cueIndex = 0;

        while (cueIndex >= 0) {
          // TODO: 섬네일 획득 즉시 PDF 처리. (순서 주의)
          thumbs.push(
            await getPlaylistSlideThumbUrl(playlistId, index, cueIndex, 1920),
          );
          cueIndex += 1;
        }
      } catch (error) {
        // EOF
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
