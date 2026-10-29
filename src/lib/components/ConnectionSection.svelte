<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import { Button } from "#lib/components/ui/button/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import * as Marker from "#lib/components/ui/marker/index.ts";
  import { Spinner } from "#lib/components/ui/spinner/index.ts";
  import type { ConnectionStatus } from "#lib/types/ui.ts";

  interface Props {
    host: string;
    port: number;
    status: ConnectionStatus;
    /** 마지막으로 연결을 시도한 기준 URL. */
    baseUrl: string;
    error: string;
    onconnect: () => void;
  }

  let {
    host = $bindable(),
    port = $bindable(),
    status,
    baseUrl,
    error,
    onconnect,
  }: Props = $props();

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onconnect();
  }
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-lg font-semibold">ProPresenter 연결</h2>

  <div class="flex flex-col gap-3">
    <form class="flex flex-wrap items-end gap-2" onsubmit={handleSubmit}>
      <Field.Field class="min-w-40 grow basis-48">
        <Field.Label for="pp-host">주소</Field.Label>
        <Input
          id="pp-host"
          type="text"
          placeholder="localhost · *.local · IP 주소 등"
          autocomplete="off"
          spellcheck="false"
          required
          bind:value={host}
        />
      </Field.Field>

      <Field.Field class="w-28">
        <Field.Label for="pp-port">포트 번호</Field.Label>
        <Input
          id="pp-port"
          type="number"
          min="1"
          max="65535"
          required
          bind:value={port}
        />
      </Field.Field>

      <Button type="submit" disabled={status === "connecting"}>
        {#if status === "connecting"}
          <Spinner aria-hidden="true" />
        {/if}
        연결
      </Button>
    </form>

    {#if status === "connected"}
      <Marker.Root role="status">
        <Marker.Icon><CircleCheckIcon /></Marker.Icon>
        <Marker.Content>
          <code class="text-xs">{baseUrl}/</code>에 연결되었습니다.
        </Marker.Content>
      </Marker.Root>
    {:else if status === "failed"}
      <!-- 오류 내용이 여러 줄일 수 있으므로 아이콘을 첫 줄에 맞춘다. -->
      <Marker.Root role="alert" class="items-start text-destructive">
        <Marker.Icon class="mt-0.5"><CircleAlertIcon /></Marker.Icon>
        <Marker.Content>
          <code class="text-xs">{baseUrl}/</code>에 연결하지 못했습니다.
          {#if error}
            <span
              class="mt-1 block text-xs break-all whitespace-pre-line opacity-80"
            >
              {error}
            </span>
          {/if}
        </Marker.Content>
      </Marker.Root>
    {/if}
  </div>
</section>
