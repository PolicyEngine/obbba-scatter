import './globals.css';
import PolicyEngineHeader from './PolicyEngineHeader';

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
        <PolicyEngineHeader />
        {children}
      </body>
    </html>
  );
}
