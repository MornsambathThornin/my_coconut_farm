'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')

      console.log('zones:', data, error)
    }

    test()
  }, [])

  return <div className="p-4">Supabase connection test</div>
}
