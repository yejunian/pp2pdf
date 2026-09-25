<script lang="ts">
  import type { ConnectionStatus } from "$lib/types/ui";

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

<section class="card card-border">
  <div class="card-body">
    <h2 class="card-title">ProPresenter 연결</h2>

    <form class="flex flex-wrap items-end gap-2" onsubmit={handleSubmit}>
      <label class="min-w-40 grow basis-48">
        <span class="label mb-1 text-sm">주소</span>
        <input
          type="text"
          class="input w-full"
          placeholder="localhost · *.local · IP 주소 등"
          autocomplete="off"
          spellcheck="false"
          required
          bind:value={host}
        />
      </label>

      <label class="w-28">
        <span class="label mb-1 text-sm">포트 번호</span>
        <input
          type="number"
          class="input w-full"
          min="1"
          max="65535"
          required
          bind:value={port}
        />
      </label>

      <button
        type="submit"
        class="btn btn-primary"
        disabled={status === "connecting"}
      >
        {#if status === "connecting"}
          <span class="loading loading-sm loading-spinner"></span>
        {/if}
        연결
      </button>
    </form>

    {#if status === "connected"}
      <div role="status" class="alert alert-soft alert-success">
        <span><code class="text-xs">{baseUrl}/</code>에 연결되었습니다.</span>
      </div>
    {:else if status === "failed"}
      <div role="alert" class="alert items-start alert-soft alert-error">
        <div class="min-w-0">
          <p><code class="text-xs">{baseUrl}/</code>에 연결하지 못했습니다.</p>
          {#if error}
            <p class="mt-1 text-xs break-all whitespace-pre-line opacity-80">
              {error}
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>
