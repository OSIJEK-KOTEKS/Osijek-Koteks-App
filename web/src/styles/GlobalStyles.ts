// src/styles/GlobalStyles.ts
import {createGlobalStyle} from 'styled-components';
import 'react-datepicker/dist/react-datepicker.css'; // Move import outside of template literal

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 100%;
  }

  body {
    min-height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${({theme}) => theme.colors.background};
    color: ${({theme}) => theme.colors.text};
  }

  #root {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  button {
    cursor: pointer;
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  a {
    color: inherit;
    text-decoration: none;
    
    &:hover {
      text-decoration: none;
    }
  }

  input, button {
    font-family: inherit;
    outline: none;
  }

  /* DatePicker custom styles */
  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker {
    font-family: inherit;
    border: 1px solid ${({theme}) => theme.colors.gray};
    border-radius: ${({theme}) => theme.borderRadius};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .react-datepicker__header {
    background-color: ${({theme}) => theme.colors.primary};
    border-bottom: none;
    padding-top: 8px;
  }

  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: white;
  }

  .react-datepicker__day {
    &:hover {
      background-color: ${({theme}) => theme.colors.gray};
    }
  }

  .react-datepicker__day--selected {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
    
    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark};
    }
  }

  .react-datepicker__day--keyboard-selected {
    background-color: ${({theme}) => theme.colors.primary};
    opacity: 0.8;
    color: white;
    
    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark};
    }
  }

  .react-datepicker__day--disabled {
    color: ${({theme}) => theme.colors.disabled};
    cursor: not-allowed;

    &:hover {
      background-color: transparent;
    }
  }

  .react-datepicker__today-button {
    background-color: ${({theme}) => theme.colors.gray};
    border-top: 1px solid ${({theme}) => theme.colors.gray};
    color: ${({theme}) => theme.colors.text};
    padding: 8px 0;
  }

  /* Form elements global styles */
  input, 
  select, 
  textarea {
    border: 1px solid ${({theme}) => theme.colors.gray};
    border-radius: ${({theme}) => theme.borderRadius};
    padding: 8px 12px;
    width: 100%;
    
    &:focus {
      border-color: ${({theme}) => theme.colors.primary};
      box-shadow: 0 0 0 2px ${({theme}) => theme.colors.primary}20;
    }
    
    &:disabled {
      background-color: ${({theme}) => theme.colors.disabled};
      cursor: not-allowed;
    }
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({theme}) => theme.colors.gray};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({theme}) => theme.colors.primary};
    border-radius: 4px;
    
    &:hover {
      background: ${({theme}) => theme.colors.primaryDark};
    }
  }

  /* Selection styles */
  ::selection {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
  }

  /* Modal styles */
  .modal-enter {
    opacity: 0;
  }

  .modal-enter-active {
    opacity: 1;
    transition: opacity 200ms ease-in;
  }

  .modal-exit {
    opacity: 1;
  }

  .modal-exit-active {
    opacity: 0;
    transition: opacity 200ms ease-out;
  }
`;
