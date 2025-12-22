import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getVariantStyles = (variant: ButtonVariant): { container: ViewStyle; text: TextStyle } => {
  const variants: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
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
        backgroundColor: '#1F2C33',
      },
      text: {
        color: '#E9EDEF',
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#2A373F',
      },
      text: {
        color: '#E9EDEF',
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: '#E9EDEF',
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
  };

  return variants[variant];
};

const getSizeStyles = (size: ButtonSize): { container: ViewStyle; text: TextStyle } => {
  const sizes: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
      },
      text: {
        fontSize: 12,
      },
    },
    default: {
      container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
      },
      text: {
        fontSize: 14,
      },
    },
    lg: {
      container: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
      },
      text: {
        fontSize: 16,
      },
    },
  };

  return sizes[size];
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        variantStyles.container,
        sizeStyles.container,
        disabled && { opacity: 0.5 },
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              {
                fontWeight: '600',
              },
              variantStyles.text,
              sizeStyles.text,
            ]}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;

