import { waitFor } from "@testing-library/react";

async function verify() {
  waitFor(() => {});
}

void verify();
