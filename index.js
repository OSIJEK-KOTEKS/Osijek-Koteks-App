/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Warning: TextElement: Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.',
]);

AppRegistry.registerComponent(appName, () => App);
