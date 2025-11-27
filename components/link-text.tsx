import React from 'react';
import { Text, type TextProps } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';

type LinkTextProps = TextProps & {
  children: string;
  linkStyle?: TextProps['style'];
};

// Simple URL regex that matches http/https links
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function LinkText({ children, style, linkStyle, ...rest }: LinkTextProps) {
  if (!children) return null;

  const parts = children.split(URL_REGEX).filter(Boolean);

  return (
    <ThemedText style={style} {...rest}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          // Reset lastIndex for global regex to ensure correct subsequent tests
          URL_REGEX.lastIndex = 0;
          return (
            <ExternalLink key={i} href={part} style={linkStyle}>
              {part}
            </ExternalLink>
          );
        }

        return (
          <Text key={i} style={style}>
            {part}
          </Text>
        );
      })}
    </ThemedText>
  );
}

export default LinkText;
