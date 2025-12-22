import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  secureTextEntry,
  style,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#8696A0',
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1F2C33',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: error ? '#F15C6D' : '#2A373F',
          paddingHorizontal: 12,
        }}
      >
        {leftIcon && (
          <View style={{ marginRight: 8 }}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            {
              flex: 1,
              paddingVertical: 12,
              fontSize: 16,
              color: '#E9EDEF',
            },
            style,
          ]}
          placeholderTextColor="#8696A0"
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{ padding: 4 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#8696A0"
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <View style={{ marginLeft: 8 }}>
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <Text
          style={{
            fontSize: 12,
            color: '#F15C6D',
            marginTop: 4,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export default Input;

