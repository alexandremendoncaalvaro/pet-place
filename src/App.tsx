/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider } from './context/AppContext';
import { MainApp } from './MainApp';

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
