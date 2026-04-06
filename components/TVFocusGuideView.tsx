import React from 'react';
import {
  Platform,
  View,
  type ViewProps,
  TVFocusGuideView as NativeTVFocusGuideView,
} from 'react-native';

type TVFocusGuideProps = ViewProps & {
  autoFocus?: boolean;
  destinations?: Array<any>;
};

const TVFocusGuideView = ({ autoFocus, destinations, ...props }: TVFocusGuideProps) => {
  if (Platform.isTV && typeof NativeTVFocusGuideView === 'function') {
    return (
      <NativeTVFocusGuideView autoFocus={autoFocus} destinations={destinations} {...props} />
    );
  }

  return <View {...props} />;
};

export default TVFocusGuideView;
