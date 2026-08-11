import { screen } from "@testing-library/react";

async function verify() {
  await screen.getByRole("button");
}

void verify();
