// src/styles/styled.d.ts
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      primaryDark: string;
      error: string;
      text: string;
      background: string;
      white: string;
      gray: string;
      disabled: string;
      success: string; // Add this line
      successDark: string; // Add this line
    };
  }
}
