import { screen, waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => expect(screen.getByRole("status")).toBeDefined());
}

void verify();
