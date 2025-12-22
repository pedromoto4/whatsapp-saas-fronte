import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: {
      backgroundColor: '#25D366',
    },
    text: {
      color: '#FFFFFF',
    },
  },
  secondary: {
    container: {
      backgroundColor: '#F59E0B',
    },
    text: {
      color: '#FFFFFF',
    },
  },
  destructive: {
    container: {
      backgroundColor: '#F15C6D',
    },
    text: {
      color: '#FFFFFF',
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#8696A0',
    },
    text: {
      color: '#8696A0',
    },
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
}) => {
  const styles = variantStyles[variant];

  return (
    <View
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          alignSelf: 'flex-start',
        },
        styles.container,
        style,
      ]}
    >
      <Text
        style={[
          {
            fontSize: 12,
            fontWeight: '600',
          },
          styles.text,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

export default Badge;

