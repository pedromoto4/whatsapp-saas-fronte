import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.container,
        value && styles.containerActive,
        disabled && styles.containerDisabled,
        style,
      ]}
    >
      <View
        style={[
          styles.thumb,
          value && styles.thumbActive,
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A373F',
    padding: 2,
    justifyContent: 'center',
  },
  containerActive: {
    backgroundColor: '#25D366',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E9EDEF',
    alignSelf: 'flex-start',
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
});

export default Switch;

