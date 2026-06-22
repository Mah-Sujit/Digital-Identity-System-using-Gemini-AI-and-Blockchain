import { useState } from "react";
import { api } from "../api/client";

export default function IdentitySubmit() {
  const [type, setType] = useState("passport");
  const [hash, setHash] = useState(
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();

    const res = await api.post("/identity/submit", {
      document_type: type,
      document_hash: hash,
    });

    setResult(res.data);
  }

  return (
    <div>
      <h2>Submit Identity</h2>

      <form onSubmit={submit}>
        <input value={type} onChange={(e) => setType(e.target.value)} />
        <input value={hash} onChange={(e) => setHash(e.target.value)} />
        <button>Submit</button>
      </form>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}