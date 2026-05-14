import { PolicyEngineShell } from "@policyengine/ui-kit/layout";
import "@policyengine/ui-kit/styles.css";

import './globals.css';

export const metadata = {
  title: 'OBBBA Household Explorer',
  description: 'PolicyEngine household-level analysis of the One Big Beautiful Bill Act',
  icons: {
    icon: '/us/obbba-household-explorer/favicon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PolicyEngineShell country="us">{children}        </PolicyEngineShell>
      </body>
    </html>
  );
}
