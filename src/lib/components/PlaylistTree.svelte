<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import * as Collapsible from "#lib/components/ui/collapsible/index.ts";
  import type { PObjectId, PPlaylistAll } from "#lib/types/pp.ts";
  import { cn } from "#lib/utils.ts";
  import ListItemButton, { LIST_ITEM_CLASS } from "./ListItemButton.svelte";
  import PlaylistTree from "./PlaylistTree.svelte";

  interface Props {
    items: PPlaylistAll;
    selectedUuid: string | undefined;
    onselect: (id: PObjectId) => void;
  }

  let { items, selectedUuid, onselect }: Props = $props();
</script>

<!-- `<li>`만 렌더링하므로 `<ul>` 안에서 사용해야 한다. -->
{#each items as item (item.id.uuid)}
  {#if item.field_type === "group"}
    <li>
      <Collapsible.Root open>
        <!-- 체크 아이콘 자리(`pr-8`)에 펼침 아이콘을 두어 오른쪽 끝을 맞춘다. -->
        <Collapsible.Trigger class={cn(LIST_ITEM_CLASS, "group/folder pr-2")}>
          <FolderIcon class="size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">{item.id.name}</span>
          <ChevronDownIcon
            class="size-4 shrink-0 text-muted-foreground transition-transform group-data-open/folder:rotate-180"
          />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <ul class="ms-3.5 border-s ps-1">
            {#if item.children.length}
              <PlaylistTree items={item.children} {selectedUuid} {onselect} />
            {:else}
              <li class="py-1 pl-1.5 text-sm text-muted-foreground">
                (비어 있음)
              </li>
            {/if}
          </ul>
        </Collapsible.Content>
      </Collapsible.Root>
    </li>
  {:else}
    <li>
      <ListItemButton
        selected={item.id.uuid === selectedUuid}
        onclick={() => onselect(item.id)}
      >
        {item.id.name}
      </ListItemButton>
    </li>
  {/if}
{/each}
