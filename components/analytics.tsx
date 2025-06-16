function isDevServer(): boolean {
  const isDev =
    typeof window !== "undefined"
      ? window.location.host.indexOf("localhost:3050") > -1 ||
        window.location.host.indexOf("192.168.") > -1
      : process.env.NODE_ENV === "development";

  return isDev;
}

export default function Analytics() {
  if (isDevServer()) {
    return null;
  }
  return (
    <>
      <script
        async
        defer
        src="https://scripts.simpleanalyticscdn.com/latest.js"
      ></script>
      <noscript>
        <img
          src="https://queue.simpleanalyticscdn.com/noscript.gif"
          alt=""
          referrerPolicy="no-referrer-when-downgrade"
        />
      </noscript>
    </>
  );
}
