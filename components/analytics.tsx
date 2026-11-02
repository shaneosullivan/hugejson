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
  // Self-hosted Umami (https://chofterstats.com). data-domains stops
  // preview deployments from being counted.
  return (
    <script
      defer
      src="https://chofterstats.com/cs.js"
      data-website-id="358d7fd8-e65b-434c-b9e7-384180f4e507"
      data-domains="hugejson.chofter.com"
    ></script>
  );
}
