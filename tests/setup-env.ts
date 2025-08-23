// Ensure PIC_URL is set for @dfinity/pic tests using inject("PIC_URL")
if (!process.env.PIC_URL) {
  process.env.PIC_URL = "http://127.0.0.1:0";
}
