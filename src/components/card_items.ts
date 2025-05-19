export enum Tag {
    Performance = "astro",
    Video = "Video",
    News = "success",
  }
  
  export function tagToIcon(tag: Tag): string {
    if (tag === Tag.Video || tag === Tag.Performance) {
      return "mdi:video-youtube";
    } else {
      return "mdi:newspaper";
    }
  }
  