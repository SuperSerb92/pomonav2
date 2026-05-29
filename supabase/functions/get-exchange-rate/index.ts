const USERNAME = Deno.env.get('NBS_USERNAME') ?? 'muftakis1986'
const PASSWORD = Deno.env.get('NBS_PASSWORD') ?? 'Krilin26061986'
const LICENCE_ID = Deno.env.get('NBS_LICENCE_ID') ?? 'c1c02e86-c529-43ca-b6cd-6af9ee00ef96'

const NBS_URL = 'https://webservices.nbs.rs/CommunicationOfficeService1_0/CurrentExchangeRateService.asmx'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function soapBody(exchangeRateListTypeID: number, rateType: number): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://communicationoffice.nbs.rs">
      <UserName>${USERNAME}</UserName>
      <Password>${PASSWORD}</Password>
      <LicenceID>${LICENCE_ID}</LicenceID>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <GetCurrentExchangeRateByRateType xmlns="http://communicationoffice.nbs.rs">
      <currencyCode>978</currencyCode>
      <exchangeRateListTypeID>${exchangeRateListTypeID}</exchangeRateListTypeID>
      <rateType>${rateType}</rateType>
    </GetCurrentExchangeRateByRateType>
  </soap:Body>
</soap:Envelope>`
}

async function fetchRate(exchangeRateListTypeID: number, rateType: number): Promise<number> {
  const res = await fetch(NBS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://communicationoffice.nbs.rs/GetCurrentExchangeRateByRateType',
    },
    body: soapBody(exchangeRateListTypeID, rateType),
  })

  if (!res.ok) throw new Error(`NBS service returned ${res.status}`)

  const xml = await res.text()

  // Extract value from <GetCurrentExchangeRateByRateTypeResult>...</GetCurrentExchangeRateByRateTypeResult>
  const match = xml.match(/<GetCurrentExchangeRateByRateTypeResult>([\d.]+)<\/GetCurrentExchangeRateByRateTypeResult>/)
  if (!match) throw new Error('Could not parse NBS response')

  return parseFloat(match[1])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // Srednji kurs: listType=2, rateType=2
    // Prodajni kurs: listType=1, rateType=3
    const [srednji, prodajni] = await Promise.all([
      fetchRate(2, 2),
      fetchRate(1, 3),
    ])

    return new Response(
      JSON.stringify({ srednji, prodajni }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
