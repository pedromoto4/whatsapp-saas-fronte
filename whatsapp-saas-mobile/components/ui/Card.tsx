import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          backgroundColor: '#1F2C33',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#2A373F',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          padding: 16,
          gap: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => {
  return (
    <Text
      style={[
        {
          fontSize: 18,
          fontWeight: '600',
          color: '#E9EDEF',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, style }) => {
  return (
    <Text
      style={[
        {
          fontSize: 14,
          color: '#8696A0',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          padding: 16,
          paddingTop: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default Card;

