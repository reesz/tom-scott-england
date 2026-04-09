import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Header } from '#/components/Layout/Header'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
