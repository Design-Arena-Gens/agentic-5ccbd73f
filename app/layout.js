export const metadata = {
  title: 'PHP Tasks Report',
  description: 'Download the generated PDF for PHP tasks',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"' }}>
        {children}
      </body>
    </html>
  );
}
