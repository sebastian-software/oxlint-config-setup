import { screen } from "@testing-library/react";

async function verify() {
  await screen.findByRole("button");
  expect(screen.getByRole("button")).toBeInTheDocument();
}

void verify();
