import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/county/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/', search: { county: params.id } })
  },
  component: () => null,
})
