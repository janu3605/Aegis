import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  const baseStyle = styles.button;
  const variantStyle = styles[`${variant}Variant`];
  const sizeStyle = styles[`${size}Size`];

  return (
    <TouchableOpacity
      style={[baseStyle, variantStyle, sizeStyle, style, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryVariant: {
    backgroundColor: COLORS.primary,
  },
  secondaryVariant: {
    backgroundColor: COLORS.secondary,
  },
  dangerVariant: {
    backgroundColor: COLORS.danger,
  },
  successVariant: {
    backgroundColor: COLORS.success,
  },
  smallSize: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediumSize: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  largeSize: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
