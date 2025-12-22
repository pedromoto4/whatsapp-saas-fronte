import React from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  StyleSheet,
} from 'react-native';

interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rows?: number;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  containerStyle,
  rows = 4,
  style,
  ...props
}) => {
  const minHeight = rows * 20; // Approximate height per row

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { minHeight },
            style,
          ]}
          placeholderTextColor="#8696A0"
          multiline
          textAlignVertical="top"
          {...props}
        />
      </View>
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8696A0',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#1F2C33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A373F',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputContainerError: {
    borderColor: '#F15C6D',
  },
  textInput: {
    fontSize: 16,
    color: '#E9EDEF',
    padding: 0, // Remove default padding
  },
  error: {
    fontSize: 12,
    color: '#F15C6D',
    marginTop: 4,
  },
});

export default Textarea;

