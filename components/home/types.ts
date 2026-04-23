export type TabId = 'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search';

export interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

export interface HomeContentRef {
  focusFirstItem: () => void;
  handleBack?: () => boolean;
}
