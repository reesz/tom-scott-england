import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { MapView } from '#/components/Map/MapView'

export const Route = createFileRoute('/county/$id')({ component: CountyPage })

function CountyPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const handleSelect = useCallback((newId: string) => {
    if (newId === id) {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/county/$id', params: { id: newId } })
    }
  }, [id, navigate])

  const handleClose = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  return <MapView selectedId={id} onSelectCounty={handleSelect} onCloseDetail={handleClose} />
}
