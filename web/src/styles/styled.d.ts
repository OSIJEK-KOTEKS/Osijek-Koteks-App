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
      success: string;
      successDark: string;
    };
    spacing: {
      small: string;
      medium: string;
      large: string;
    };
    borderRadius: string;
    shadows: {
      main: string;
    };
  }
}
