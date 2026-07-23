export type Playlist = {
  id: ObjectId;
  items: PlaylistItem[];
};

type ObjectId = {
  uuid: string;
  name: string;
  index: number;
};

export type FocusedPlaylist = {
  playlist: ObjectId | null;
  item: ObjectId | null;
  playlist_item: PlaylistItem;
};

type PlaylistItem = PlaylistHeader | PlaylistPlaceholder | PlaylistPresentation;

type PlaylistItemBase = {
  id: ObjectId; // 주의: 프레젠테이션이 아니라 재생목록 항목의 ID임.
  is_hidden: boolean;
  is_pco: boolean;
};

type PlaylistHeader = PlaylistItemBase & {
  type: "header";
  header_color: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  destination: "presentation";
};

type PlaylistPlaceholder = PlaylistItemBase & {
  type: "placeholder";
  destination: "presentation";
};

type PlaylistPresentation = PlaylistItemBase & {
  type: "presentation";
  duration?: number; // 6마다 1초(버림), 없으면 생략
  presentation_info: {
    presentation_uuid: string;
    arrangement_name: string; // 마스터 정렬이면 ""
    arrangement_uuid: string; // 마스터 정렬이면 ""
  };
  destination: "presentation" | "announcements";
};
