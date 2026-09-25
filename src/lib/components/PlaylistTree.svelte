<script lang="ts">
  import type { PObjectId, PPlaylistAll } from "$lib/types/pp";
  import PlaylistTree from "./PlaylistTree.svelte";

  interface Props {
    items: PPlaylistAll;
    selectedUuid: string | undefined;
    onselect: (id: PObjectId) => void;
  }

  let { items, selectedUuid, onselect }: Props = $props();
</script>

<!-- `<li>`만 렌더링하므로 `<ul class="menu">` 안에서 사용해야 한다. -->
{#each items as item (item.id.uuid)}
  {#if item.field_type === "group"}
    <li>
      <details open>
        <summary>
          <span aria-hidden="true">📁</span>
          {item.id.name}
        </summary>
        <ul>
          {#if item.children.length}
            <PlaylistTree items={item.children} {selectedUuid} {onselect} />
          {:else}
            <li class="menu-disabled"><span>(비어 있음)</span></li>
          {/if}
        </ul>
      </details>
    </li>
  {:else}
    <li>
      <button
        type="button"
        class={{ "menu-active": item.id.uuid === selectedUuid }}
        aria-pressed={item.id.uuid === selectedUuid}
        onclick={() => onselect(item.id)}
      >
        {item.id.name}
      </button>
    </li>
  {/if}
{/each}
