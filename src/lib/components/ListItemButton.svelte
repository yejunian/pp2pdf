<script lang="ts" module>
  /**
   * 목록 항목 버튼의 클래스. `<Select.Item>`처럼 마우스를 올리거나 포커스하면
   * 배경을 칠한다. 선택한 항목은 같은 배경(`SELECTED_CLASS`)을 칠하고, 오른쪽
   * (`pr-8` 자리)에 체크 아이콘을 둔다.
   */
  export const LIST_ITEM_CLASS =
    "relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";

  const SELECTED_CLASS = "bg-accent text-accent-foreground";
</script>

<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import type { Snippet } from "svelte";

  interface Props {
    selected: boolean;
    onclick: () => void;
    children: Snippet;
  }

  let { selected, onclick, children }: Props = $props();
</script>

<button
  type="button"
  class={[LIST_ITEM_CLASS, selected && SELECTED_CLASS]}
  aria-pressed={selected}
  {onclick}
>
  <span class="min-w-0 flex-1">{@render children()}</span>
  {#if selected}
    <CheckIcon
      aria-hidden="true"
      class="pointer-events-none absolute right-2 size-4"
    />
  {/if}
</button>
