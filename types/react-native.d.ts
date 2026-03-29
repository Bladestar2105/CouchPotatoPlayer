import 'react-native';

declare module 'react-native' {
  interface TextInputProps {
    tvFocusable?: boolean;
  }

  /**
   * TVEventControl - React Native tvOS API for controlling TV remote behavior
   * 
   * Available in react-native-tvos 0.84.x
   * 
   * - enableTVMenuKey(): Allows the app to intercept the menu button on tvOS
   *   instead of immediately exiting to the home screen. When enabled, menu
   *   button presses can be handled via BackHandler and useTVEventHandler.
   * 
   * - disableTVMenuKey(): Restores default menu button behavior (exits app on root screen)
   */
  interface TVEventControlStatic {
    /**
     * Enable interception of the TV menu button.
     * Call this on non-root screens to prevent app exit when menu is pressed.
     */
    enableTVMenuKey(): void;
    
    /**
     * Disable interception of the TV menu button.
     * Call this when returning to the root screen to restore default exit behavior.
     */
    disableTVMenuKey(): void;
  }

  /**
   * TVEventControl (formerly TVMenuControl in earlier versions)
   * Provides control over TV remote button behavior on tvOS and Android TV
   */
  const TVEventControl: TVEventControlStatic;

  /**
   * useTVEventHandler hook return type
   */
  interface TVRemoteEvent {
    eventType: 'menu' | 'up' | 'down' | 'left' | 'right' | 'select' | 'playPause' | 'fastForward' | 'rewind';
    eventKeyAction?: number;
  }

  /**
   * Hook for handling TV remote events
   * @param handler Callback function to handle remote events
   */
  function useTVEventHandler(handler: (event: TVRemoteEvent) => void): void;
}