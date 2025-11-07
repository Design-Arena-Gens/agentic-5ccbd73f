export default function Page() {
  return (
    <main style={{ maxWidth: 820, margin: '40px auto', padding: 24 }}>
      <h1>PHP Tasks Project PDF</h1>
      <p>The PDF is generated in the build step. Download it below:</p>
      <p>
        <a href="/report.pdf" download>Download report.pdf</a>
      </p>
      <hr />
      <h2>Preview of Output Screenshots</h2>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <figure>
          <img src="/images/task1_output.png" alt="Task 1 output" style={{ width: 360, border: '1px solid #ddd', borderRadius: 6 }} />
          <figcaption>Task 1 Output</figcaption>
        </figure>
        <figure>
          <img src="/images/task2_output.png" alt="Task 2 output" style={{ width: 360, border: '1px solid #ddd', borderRadius: 6 }} />
          <figcaption>Task 2 Output</figcaption>
        </figure>
      </div>
    </main>
  );
}
