# Presupuesto comparativo de despliegue en AWS, Azure, Google Cloud y Render

4 de noviembre de 2026

## Alcance y supuestos

El presupuesto calcula el coste mensual, con precios de lista bajo demanda, de una misma arquitectura en las cuatro plataformas.

| Componente | Requisito |
| --- | --- |
| Servidor de aplicaciones | 2 vCPU, 4 GB de RAM, 730 h/mes |
| Base de datos | PostgreSQL gestionado, 2 vCPU, 4 GB de RAM, 50 GB SSD |
| Red | 100 GB/mes de tráfico de salida a Internet |
| Seguridad | WAF básico, certificados TLS, 50 GB de almacenamiento de copias |

Supuestos de cálculo:

- Regiones de España, por proximidad a los usuarios y para mantener los datos en la UE (RGPD): AWS eu-south-2 (Aragón), Azure Spain Central (Madrid) y Google Cloud europe-southwest1 (Madrid). Render no tiene región en España; se usa Frankfurt, que cuesta lo mismo que sus otras regiones.
- Precios en USD, sin impuestos, sin descuentos por compromiso (Reserved Instances, Savings Plans, CUD) ni capas gratuitas.
- Base de datos en una sola zona, sin réplica en alta disponibilidad: duplicaría su coste en las tres nubes.
- El WAF se dimensiona para un tráfico modesto: 1 millón de peticiones al mes.
- Sin balanceador de carga dedicado salvo donde el WAF lo exige para poder conectarse.

## Comparativa de costes mensuales

AWS es la opción más barata (111,58 USD/mes) y Azure la más cara (450,54 USD/mes), casi todo por el WAF. En las regiones españolas las tres nubes salen entre un 8 % y un 25 % más caras que en EE. UU.; Render no cambia.

| Plataforma | Cómputo (USD) | Base de datos (USD) | Red (USD) | Seguridad (USD) | Total (USD/mes) |
| --- | --: | --: | --: | --: | --: |
| AWS | 33,29 | 63,29 | 0,00 | 15,00 | **111,58** |
| Google Cloud | 28,86 | 106,56 | 11,88 | 33,80 | **181,10** |
| Render | 110,00 | 89,70 | 11,25 | 25,00 | **235,95** |
| Azure | 33,43 | 64,96 | 0,00 | 352,15 | **450,54** |

Seguridad agrupa WAF, certificados TLS y el almacenamiento de 50 GB de copias, junto con el balanceador o CDN que el WAF necesita para funcionar. En Render, Cómputo incluye la cuota del espacio de trabajo Pro (25 USD).

## Desglose por plataforma

Cada línea indica el servicio elegido, su precio unitario y el cálculo a 730 h/mes.

### AWS (eu-south-2, España)

| Concepto | Servicio | Precio unitario | Mensual (USD) |
| --- | --- | --- | --: |
| Cómputo | EC2 t3.medium (2 vCPU, 4 GiB), Linux | 0,0456 USD/h | 33,29 |
| Base de datos | RDS for PostgreSQL db.t3.medium, Single-AZ | 0,078 USD/h | 56,94 |
| Base de datos | Almacenamiento gp3, 50 GB | 0,127 USD/GB-mes | 6,35 |
| Red | 100 GB de salida servidos por CloudFront | incluidos en el plan Pro (50 TB) | 0,00 |
| Seguridad | CloudFront plan Pro: AWS WAF (25 reglas), DDoS siempre activo, 10 M peticiones | 15 USD/mes (precio global) | 15,00 |
| Seguridad | Certificado TLS de AWS Certificate Manager | gratuito | 0,00 |
| Seguridad | Copias de RDS, 50 GB | gratis hasta el 100 % del almacenamiento aprovisionado | 0,00 |

Sin CloudFront, el WAF regional exige un Application Load Balancer (en us-east-1, 0,0225 USD/h más 0,008 USD/LCU-h, unos 22 USD/mes) y la web ACL (5 USD/mes, 1 USD por regla, 0,60 USD por millón de peticiones). La salida a Internet seguiría costando 0 USD, porque AWS regala 100 GB/mes.

### Google Cloud (europe-southwest1, Madrid)

| Concepto | Servicio | Precio unitario | Mensual (USD) |
| --- | --- | --- | --: |
| Cómputo | Compute Engine e2-medium (2 vCPU compartidas, 4 GB) | 0,0395 USD/h | 28,86 |
| Base de datos | Cloud SQL for PostgreSQL Enterprise, 2 vCPU + 4 GB, zona única | ≈ 0,0491 USD/vCPU-h + ≈ 0,0085 USD/GB-h | 96,36 |
| Base de datos | Almacenamiento SSD, 50 GB | ≈ 0,204 USD/GB-mes (estimado) | 10,20 |
| Red | Salida Premium Tier a Internet (99 GB facturables) | 0,12 USD/GiB | 11,88 |
| Seguridad | Application Load Balancer externo global (regla de reenvío) | 0,025 USD/h | 18,25 |
| Seguridad | Cloud Armor Standard: 1 política, 5 reglas, 1 M peticiones | 5 USD + 1 USD/regla + 0,75 USD/M | 10,75 |
| Seguridad | Certificado TLS gestionado por Google | gratuito | 0,00 |
| Seguridad | Copias de Cloud SQL, 50 GB | ≈ 0,096 USD/GB-mes (estimado) | 4,80 |

El e2-medium usa vCPU compartidas con ráfagas. Las páginas oficiales de Compute Engine y Cloud SQL solo traen en el HTML los precios de Iowa y cargan los de Madrid de forma dinámica. Por eso los precios de Madrid se tomaron de agregadores basados en los SKU oficiales (gcloud-compute.com y Bytebase), y quedan entre un 18 % y un 20 % por encima de Iowa. El almacenamiento y las copias de Cloud SQL se estiman aplicando ese mismo +20 %; conviene confirmarlos en la calculadora.

### Render (Frankfurt)

| Concepto | Servicio | Precio unitario | Mensual (USD) |
| --- | --- | --- | --: |
| Cómputo | Espacio de trabajo Pro | 25 USD/mes | 25,00 |
| Cómputo | Web Service 2 CPU / 4 GB (2c-4g) | 85 USD/mes | 85,00 |
| Base de datos | Render Postgres 2 CPU / 4 GB (2c-4g) | 75 USD/mes | 75,00 |
| Base de datos | Almacenamiento ampliable, 49 GB adicionales (1 GB incluido) | 0,30 USD/GB-mes | 14,70 |
| Red | 75 GB por encima de los 25 GB incluidos en Pro | 0,15 USD/GB | 11,25 |
| Seguridad | Cloudflare Pro delante del servicio (WAF con reglas gestionadas) | 25 USD/mes con pago mensual | 25,00 |
| Seguridad | TLS automático y mitigación DDoS de Render | incluidos | 0,00 |
| Seguridad | Copias lógicas y PITR de 7 días | incluidos en Pro | 0,00 |

Render ya no vende el plan "Standard" con esos recursos: Standard ofrecía 1 CPU y 2 GB por 25 USD. Para cumplir el requisito de 2 vCPU y 4 GB hace falta la instancia 2c-4g.

### Azure (Spain Central)

| Concepto | Servicio | Precio unitario | Mensual (USD) |
| --- | --- | --- | --: |
| Cómputo | Máquina virtual B2s (2 vCPU, 4 GB), Linux | 0,0458 USD/h | 33,43 |
| Base de datos | Azure Database for PostgreSQL Flexible Server, Burstable B2s | 0,0796 USD/h | 58,11 |
| Base de datos | Almacenamiento, 50 GB | 0,1369 USD/GB-mes | 6,85 |
| Red | 100 GB de salida a Internet | primeros 100 GB gratis | 0,00 |
| Seguridad | Application Gateway WAF v2: coste fijo | 0,468 USD/h | 341,64 |
| Seguridad | Application Gateway WAF v2: 1 unidad de capacidad | 0,0144 USD/h | 10,51 |
| Seguridad | Certificado TLS (Let's Encrypt importado en Key Vault) | gratuito | 0,00 |
| Seguridad | Copias de PostgreSQL, 50 GB | gratis hasta el 100 % del almacenamiento aprovisionado | 0,00 |

Azure Front Door Standard con política WAF bajaría la seguridad a unos 44 USD/mes (35 USD de base, 5 USD por política, 1 USD por regla y 0,60 USD por millón de peticiones). Sin embargo, solo admite reglas personalizadas: los conjuntos de reglas gestionados (OWASP) requieren Front Door Premium o Application Gateway WAF v2.

Ninguna de las tres nubes incluye en el cómputo el disco de arranque de la VM, que añade entre 1 y 3 USD/mes.

## Justificación de los componentes de seguridad

En las cuatro plataformas se eligió la opción más barata que ofrece reglas WAF gestionadas contra el OWASP Top 10, TLS sin coste y copias restaurables a un punto en el tiempo.

| Plataforma | WAF | TLS | Copias de seguridad |
| --- | --- | --- | --- |
| AWS | AWS WAF incluido en CloudFront Pro: reglas gestionadas, limitación de peticiones y DDoS en el borde, sin pago por petición hasta 10 M | ACM emite y renueva el certificado de CloudFront de forma automática | Copias automáticas de RDS con PITR; gratis mientras no superen el almacenamiento aprovisionado |
| Google Cloud | Cloud Armor Standard con reglas WAF preconfiguradas (OWASP) sobre el balanceador global | Certificado gestionado por Google en el balanceador, con renovación automática | Copias automáticas de Cloud SQL con PITR, facturadas por GB |
| Render | Cloudflare Pro como proxy inverso: conjunto de reglas gestionado de Cloudflare y protección DDoS. Render no ofrece WAF propio, solo reglas de IP de entrada | TLS automático de Render en el origen y Universal SSL de Cloudflare en el borde | Copias lógicas y PITR de 7 días incluidas en el plan Pro |
| Azure | Application Gateway WAF v2 con el Default Rule Set (OWASP) gestionado por Microsoft | Certificado guardado en Key Vault y terminado en el Application Gateway | Copias automáticas de Flexible Server con PITR; gratis hasta el tamaño aprovisionado |

Los tres criterios responden a riesgos concretos:

- **WAF con reglas gestionadas**: filtra inyección SQL, XSS y escaneos antes de que lleguen a la aplicación, y el proveedor mantiene las firmas al día. Un WAF solo con reglas personalizadas, como Front Door Standard, deja ese mantenimiento al equipo.
- **TLS gestionado**: la renovación automática elimina la caída de servicio por un certificado caducado.
- **Copias con PITR**: permiten volver a un instante anterior a un borrado o un ataque de ransomware. Las copias deben guardarse separadas de la base y cifradas, porque contienen datos personales.

## Conclusión

Se recomienda AWS: cumple todos los requisitos de seguridad por 111,58 USD/mes en su región de España, un 38 % menos que la siguiente opción.

- **AWS** gana porque el plan CloudFront Pro agrupa WAF, DDoS, TLS y 50 TB de tráfico por 15 USD/mes, y las copias de RDS no se cobran hasta los 50 GB.
- **Google Cloud** (181,10 USD) es la segunda opción: Cloud Armor es barato, pero el balanceador obligatorio y una base de datos más cara en Madrid suben el total.
- **Render** (235,95 USD) es la más sencilla de operar, con TLS, DDoS y PITR incluidos, pero cobra más por los mismos recursos, necesita un WAF externo y no tiene región en España.
- **Azure** (450,54 USD) es la más cara porque su WAF con reglas gestionadas exige Application Gateway, que en Spain Central cuesta 352 USD/mes por sí solo.

Si el equipo no tiene experiencia en infraestructura, Render compensa su sobrecoste con menos superficie de configuración y, por tanto, menos riesgo de errores. Para producción real conviene añadir alta disponibilidad a la base de datos, que en las tres nubes duplica su coste.

## Fuentes

Precios consultados el 4 de noviembre de 2026 en las páginas oficiales de cada proveedor.

- AWS: [AWS Pricing](https://aws.amazon.com/pricing/), [EC2 On-Demand](https://aws.amazon.com/ec2/pricing/on-demand/), [RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/), [AWS WAF](https://aws.amazon.com/waf/pricing/), [CloudFront](https://aws.amazon.com/cloudfront/pricing/), [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- Azure: [Calculadora de precios de Azure](https://azure.microsoft.com/es-es/pricing/calculator/), [Azure Retail Prices API](https://prices.azure.com/api/retail/prices) (consultada para Spain Central: B2s, PostgreSQL Flexible Server, Application Gateway y ancho de banda; Front Door como servicio global)
- Google Cloud: [Google Cloud Pricing](https://cloud.google.com/pricing), [Compute Engine](https://cloud.google.com/compute/vm-instance-pricing), [Cloud SQL](https://cloud.google.com/sql/pricing), [Cloud Armor](https://cloud.google.com/armor/pricing), [Cloud Load Balancing](https://cloud.google.com/load-balancing/pricing), [Network pricing](https://cloud.google.com/vpc/network-pricing)
- Google Cloud, precios de Madrid: [gcloud-compute.com: e2-medium](https://gcloud-compute.com/e2-medium.html), [Bytebase: db-standard-1](https://www.bytebase.com/dbcost/cloudsql/instance/db-standard-1.md), [Bytebase: db-highmem-2](https://www.bytebase.com/dbcost/cloudsql/instance/db-highmem-2.md)
- Render: [Render Pricing](https://render.com/pricing)
- Cloudflare: [Planes de Cloudflare](https://www.cloudflare.com/plans/)
