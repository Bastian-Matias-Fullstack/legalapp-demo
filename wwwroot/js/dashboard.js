function configurarSidebarPorRoles(roles) {
    roles = Array.isArray(roles) ? roles : [];

    const isAdmin = roles.includes("Admin");
    const isAbogado = roles.includes("Abogado");
    const isSoporte = roles.includes("Soporte");

    // Admin ve todo
    if (isAdmin) return;

    // Dashboard nav: solo Admin o Abogado
    if (!isAbogado) {
        document.getElementById("nav-dashboard")?.remove();
    }

    // Roles nav: solo Admin
    document.getElementById("nav-roles")?.remove();

    // Usuarios nav: Admin o Soporte
    if (!isSoporte) {
        document.getElementById("nav-usuarios")?.remove();
    }

    // Casos nav: Admin o Abogado
    if (!isAbogado) {
        document.getElementById("nav-casos")?.remove();
    }
}

function CanAccess(moduloId, roles) {
    roles = Array.isArray(roles) ? roles : [];

    const isAdmin = roles.includes("Admin");
    const isAbogado = roles.includes("Abogado");
    const isSoporte = roles.includes("Soporte");

    // Admin ve todo
    if (isAdmin) return true;

    // Dashboard: Admin o Abogado
    if (moduloId === "mod-dashboard") return isAbogado;

    // Casos: Admin o Abogado
    if (moduloId === "mod-casos") return isAbogado;

    // Usuarios: Admin o Soporte
    if (moduloId === "mod-usuarios") return isSoporte;

    // Roles: solo Admin
    if (moduloId === "mod-roles") return false;

    // Por defecto, denegar
    return false;
}
function clearSessionAndRedirect(reason = "session-ended") {
    console.warn("Sesión finalizada:", reason);

    localStorage.removeItem("jwt_token");
    localStorage.removeItem("usuario_actual");
    sessionStorage.removeItem("demoContext");

    history.replaceState(null, "", "dashboard.html");
    window.location.replace("login.html");
}
function obtenerRolesDesdeJWT() {
        const token = localStorage.getItem("jwt_token");
        if (!token) return [];
        try {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64);
            const payload = JSON.parse(payloadJson);
            const roles = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
          return Array.isArray(roles) ? roles.filter(Boolean) : (roles ? [roles] : []);
        } catch (e) {
            console.error("Error al decodificar el token:", e);
            return [];
        }
    }
            function obtenerRolEfectivo(roles) {
        if (roles.includes("Admin")) return "Admin";
        if (roles.includes("Abogado")) return "Abogado";
        if (roles.includes("Soporte")) return "Soporte";
        return null;
}
function normalizarRoles(roles) {
    if (!Array.isArray(roles)) return [];
    return roles.filter(Boolean);
}

function tieneRolValido(roles) {
    roles = normalizarRoles(roles);
    return roles.includes("Admin") || roles.includes("Abogado") || roles.includes("Soporte");
}

    function obtenerModuloDefaultPorRol(roles) {
        roles = normalizarRoles(roles);

        if (roles.includes("Admin")) return "mod-dashboard";
        if (roles.includes("Abogado")) return "mod-dashboard";
        if (roles.includes("Soporte")) return "mod-usuarios";

        return null;
    }

function resolverModuloInicial(roles, moduloSolicitado) {
    roles = normalizarRoles(roles);

    if (!tieneRolValido(roles)) {
        return {
            allowed: false,
            reason: "no-role",
            target: null
        };
    }

    const modulosValidos = ["mod-dashboard", "mod-casos", "mod-roles", "mod-usuarios"];

    if (moduloSolicitado && modulosValidos.includes(moduloSolicitado) && CanAccess(moduloSolicitado, roles)) {
        return {
            allowed: true,
            reason: "requested-allowed",
            target: moduloSolicitado
        };
    }

    const fallback = obtenerModuloDefaultPorRol(roles);

    if (!fallback) {
        return {
            allowed: false,
            reason: "no-available-module",
            target: null
        };
    }

    if (moduloSolicitado && modulosValidos.includes(moduloSolicitado) && !CanAccess(moduloSolicitado, roles)) {
        return {
            allowed: true,
            reason: "requested-denied-fallback",
            target: fallback
        };
    }

    return {
        allowed: true,
        reason: "default",
        target: fallback
    };
}
        function aplicarVisibilidadPorRol(roles) {
            roles = Array.isArray(roles) ? roles : [];

            const gestionRoles = document.getElementById("seccion-gestion-roles");
            const btnNuevoCaso = document.getElementById("btnNuevoCaso");
            const tablaCasos = document.getElementById("tablaCasosWrapper");
            const seccionUsuarios = document.getElementById("seccion-usuarios");
            const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");

            const isAdmin = roles.includes("Admin");
            const isAbogado = roles.includes("Abogado");
            const isSoporte = roles.includes("Soporte");

            // Reset
            [gestionRoles, btnNuevoCaso, tablaCasos, seccionUsuarios, btnNuevoUsuario]
                .forEach(el => el?.classList.add("d-none"));

            // Admin ve todo
            if (isAdmin) {
                gestionRoles?.classList.remove("d-none");
                btnNuevoCaso?.classList.remove("d-none");
                tablaCasos?.classList.remove("d-none");
                seccionUsuarios?.classList.remove("d-none");
                btnNuevoUsuario?.classList.remove("d-none");
                return;
            }

            // Multi-rol: unión de permisos
            if (isAbogado) {
                btnNuevoCaso?.classList.remove("d-none");
                tablaCasos?.classList.remove("d-none");
            }

            if (isSoporte) {
                seccionUsuarios?.classList.remove("d-none");
                btnNuevoUsuario?.classList.remove("d-none");
            }
    }
    function navigate(moduloId) {
    const roles = obtenerRolesDesdeJWT();

        if (!CanAccess(moduloId, roles)) {
            const fallback = obtenerModuloDefaultPorRol(roles) || "mod-dashboard";

            Swal?.fire?.({
                icon: "warning",
                title: "Acceso denegado",
                text: "No tienes permisos para acceder a este módulo."
            });

            // Mostrar fallback
            mostrarModulo(fallback);
            history.replaceState(null, "", `#${fallback}`);

            // Marcar activo el item del menú del fallback
            document.querySelectorAll(".sidebar-menu li")
                .forEach(li => li.classList.remove("active"));

            const fallbackNavId = "nav-" + fallback.replace("mod-", "");
            document.getElementById(fallbackNavId)?.classList.add("active");

            //  Ejecutar lógica de carga del módulo fallback
            onModuloCargado(fallback);

            //Reaplicar visibilidad por roles
            aplicarVisibilidadPorRol(roles);

            return;
        }

        mostrarModulo(moduloId);
        history.replaceState(null, "", `#${moduloId}`);
  
    // 2️ Estado activo del menú
    document.querySelectorAll(".sidebar-menu li")
        .forEach(li => li.classList.remove("active"));

    const navId = "nav-" + moduloId.replace("mod-", "");
    document.getElementById(navId)?.classList.add("active");
    // AQUÍ SE ENGANCHA EL PASO 1
    onModuloCargado(moduloId);
        aplicarVisibilidadPorRol(roles);
        if (isMobileViewport()) {
            closeSidebarMobile();
        }
}
// Demo Context 
const demoContext = sessionStorage.getItem("demoContext"); 
function applyDemoContextVisibility(context) {
    const casos = document.getElementById("tablaCasosWrapper");
    const roles = document.getElementById("seccion-gestion-roles");
    const usuarios = document.getElementById("seccion-usuarios");
    // Ocultamos todo primero
    [casos, roles, usuarios].forEach(el => el?.classList.add("d-none"));

    switch (context) {
        case "casos":
            casos?.classList.remove("d-none");
            break;

        case "roles":
            roles?.classList.remove("d-none");
            break;

        case "usuarios":
            usuarios?.classList.remove("d-none");
            break;

        default:
            // sin demoContext → comportamiento normal
            [casos, roles, usuarios].forEach(el => el?.classList.remove("d-none"));
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("jwt_token");
    if (!token) {
        clearSessionAndRedirect("missing-token");
        return;
    }


    const roles = normalizarRoles(obtenerRolesDesdeJWT());

    if (!tieneRolValido(roles)) {
        Swal?.fire?.({
            icon: "warning",
            title: "Acceso no disponible",
            text: "Tu cuenta no tiene un rol asignado. No es posible ingresar a esta demo."
        }).then(() => {
            clearSessionAndRedirect("no-valid-role");
        });

        return;
    }

    configurarSidebarPorRoles(roles);
    aplicarVisibilidadPorRol(roles);

    const hashModulo = (window.location.hash || "").replace("#", "").trim();
    const moduloSolicitado = hashModulo || null;

    const decision = resolverModuloInicial(roles, moduloSolicitado);

    if (!decision.allowed || !decision.target) {
        clearSessionAndRedirect("invalid-initial-module-decision");
        return;
    }
    document.body.classList.remove("auth-pending");
    document.body.classList.add("auth-ready");

    if (decision.reason === "requested-denied-fallback") {
        Swal?.fire?.({
            icon: "info",
            title: "Redirección segura",
            text: "Tu rol no tiene acceso al módulo solicitado. Te redirigimos a tu módulo disponible."
        });
    }

    navigate(decision.target);

    const apiUrl = "api/Casos";
    /* Define la URL base para la API de casos.*/
    /*Recupera el token JWT desde localStorage (para autorizar las peticiones).*/
    let usuario = JSON.parse(localStorage.getItem("usuario_actual"));
    if (!usuario) {
        usuario = {};
    }

    const saludoDesktop = document.getElementById("saludoUsuario");
    const saludoMobile = document.getElementById("saludoUsuarioMobile");

    function renderSaludoUsuario(usuario) {
        const nombreCompleto = (usuario?.nombre || "").trim();
        const primerNombre = nombreCompleto.split(" ")[0] || "";

        const textoDesktop = nombreCompleto ? `Hola, ${nombreCompleto}` : "Hola";
        const textoMobile = primerNombre ? `Hola, ${primerNombre}` : "Hola";

        if (saludoDesktop) {
            saludoDesktop.textContent = textoDesktop;
            saludoDesktop.setAttribute("title", textoDesktop);
        }

        if (saludoMobile) {
            saludoMobile.textContent = textoMobile;
            saludoMobile.setAttribute("title", textoMobile);
        }
    }

    console.log("Rol del usuario:", roles);

    // Siempre aplicar reglas de rol (base de la app)
    // Solo si existe demoContext, se aplica encima (modo demo)

    // Aplicamos Choise.Js
    const filtroEstado = document.getElementById("filtroEstado");
    const choicesEstado = new Choices(filtroEstado, {
        searchEnabled: false,
        itemSelectText: '',
        shouldSort: false
    });

    const filtros = {
        estado: null,
        pagina: 1,
        tamanio: 10
    };
    renderSaludoUsuario(usuario);

    window.addEventListener("resize", () => {
        renderSaludoUsuario(usuario);
    });
    cargarCasosDesdeBackend();
    initPdfExport();

// PAGINACIÓN: listener único 
const paginacion = document.getElementById("paginacion");

paginacion?.addEventListener("click", (e) => {
    const link = e.target.closest(".page-link");
    if (!link) return;

    e.preventDefault();

    const nuevaPagina = parseInt(link.dataset.page, 10);
    if (!Number.isInteger(nuevaPagina)) return;

    if (nuevaPagina !== filtros.pagina) {
        filtros.pagina = nuevaPagina;
        cargarCasosDesdeBackend();
    }
});

    /* Ejecuta carga inicial.*/
    filtroEstado.addEventListener("change", () => {
        const estadoSeleccionado = filtroEstado.value?.trim();
        filtros.estado = estadoSeleccionado || null;
        filtros.pagina = 1;
        let casosFiltrados = [];

        cargarCasosDesdeBackend();
    });
    /* Actualiza el filtro de estado y recarga la tabla */
    function construirQueryString(filtros) {
        const params = new URLSearchParams();
        if (filtros.estado) params.append("estado", filtros.estado);
        if (filtros.pagina) params.append("pagina", filtros.pagina);
        if (filtros.tamanio) params.append("tamanio", filtros.tamanio);
        return "?" + params.toString();
    }
    /*Transforma tu objeto filtros en un query string para el fetch.*/
    async function cargarCasosDesdeBackend() {
        const query = construirQueryString(filtros);

        const response = await fetch(`${apiUrl}${query}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });


        if (!response.ok) {
            if (response.status === 401) {
                clearSessionAndRedirect("expired-session-401");
                return;
            }

            console.error("Error al obtener los casos:", response.status);
            return;
        }

        const data = await response.json();
        window.casosGlobal = data.items || [];

        // Validación mínima para evitar errores si backend falla
        if (!data.items || !data.resumen) {
            console.warn("⚠️ La respuesta del backend no tiene el formato esperado:", data);
            document.getElementById("contadorResultados").textContent =
                "⚠️ No se pudieron cargar los datos correctamente.";
            return;
        }

        renderizarTabla(data.items);
        renderizarCardsCasos(data.items);
        actualizarResumen(data.resumen);
        mostrarMensajeInformativo(data.items.length, data.totalRegistros);
        renderizarPaginacion(data.pagina, data.totalPaginas);

    }

    function renderizarTabla(lista) {
        const tbody = document.getElementById("casosBody");
        tbody.classList.remove("opacity-100");
        tbody.classList.add("opacity-0");
        tbody.innerHTML = "";

        lista.forEach(caso => {
            const estadoBadge = getEstadoBadge(caso.estado);
            const tipoIcono = getTipoIcono(caso.tipoCaso);
            const claseFila = `tr-${caso.estado.toLowerCase()}`;

            //validacion para mostrar mensaje de cerrar solo si no esta cerrado
            const puedeCerrar = caso.estado.toLowerCase() !== "cerrado";
            const puedeEditar = caso.estado.toLowerCase() !== "cerrado";
            const puedeEliminar = caso.estado.toLowerCase() !== "cerrado";
            const row = `
            <tr class="${claseFila}">
                <td>${caso.id}</td>
                <td>${caso.titulo}</td>
                <td>${estadoBadge}</td>
                <td>${tipoIcono}${caso.tipoCaso}</td>
                <td>${caso.nombreCliente || 'No Client'}</td>
                <td>${new Date(caso.fechaCreacion).toLocaleDateString()}</td>
                <td class="text-nowrap">
                   <button class="btn btn-sm btn-outline-light me-1 btn-ver" data-id="${caso.id}" title="Ver">
                   <i class="bi bi-eye-fill"></i>
                    </button>
                    ${puedeEditar ? `
                      <button class="btn btn-sm btn-outline-warning" title="Editar">
                         <i class="bi bi-pencil-fill"></i>
                      </button>` : ""}

                                  ${puedeEliminar ? `
                   <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${caso.id}" title="Eliminar">
                       <i class="bi bi-trash-fill"></i>
                   </button>` : ""}

                      ${puedeCerrar ? `
                     <button class="btn btn-sm btn-outline-secondary btn-cerrar" data-id="${caso.id}" title="Cerrar">
                       <i class="bi bi-lock-fill"></i>
                     </button>` : ""}
                </td>
            </tr>
        `;
            tbody.innerHTML += row;
        });

        /** Limpia y vuelve a renderizar la tabla de casos con animación suave (opacity).
 Inserta HTML dinámico fila por fila */

        setTimeout(() => {
            tbody.classList.remove("opacity-0");
            tbody.classList.add("opacity-100");
        }, 50);
    }
    function renderizarCardsCasos(lista) {
        const cardsContainer = document.getElementById("casosCards");
        if (!cardsContainer) return;

        cardsContainer.innerHTML = "";

        lista.forEach(caso => {
            const estadoBadge = getEstadoBadge(caso.estado);
            const tipoIcono = getTipoIcono(caso.tipoCaso);

            const puedeCerrar = caso.estado.toLowerCase() !== "cerrado";
            const puedeEditar = caso.estado.toLowerCase() !== "cerrado";
            const puedeEliminar = caso.estado.toLowerCase() !== "cerrado";

            const card = `
            <article class="caso-card" data-id="${caso.id}" data-estado="${caso.estado}">
                <div class="caso-card-header">
                    <div class="caso-card-title-wrap">
                        <span class="caso-card-id">#${caso.id}</span>
                        <h6 class="caso-card-title mb-1">${caso.titulo}</h6>
                    </div>
                    <div class="caso-card-badge">
                        ${estadoBadge}
                    </div>
                </div>

                <div class="caso-card-body">
                    <div class="caso-card-row">
                        <span class="caso-card-label">Tipo</span>
                        <span class="caso-card-value">${tipoIcono}${caso.tipoCaso}</span>
                    </div>

                    <div class="caso-card-row">
                        <span class="caso-card-label">Cliente</span>
                        <span class="caso-card-value">${caso.nombreCliente || "No Client"}</span>
                    </div>

                    <div class="caso-card-row">
                        <span class="caso-card-label">Creación</span>
                        <span class="caso-card-value">${new Date(caso.fechaCreacion).toLocaleDateString()}</span>
                    </div>
                </div>

                <div class="caso-card-actions">
                    <button class="btn btn-sm btn-outline-light me-1 btn-ver" data-id="${caso.id}" title="Ver">
                        <i class="bi bi-eye-fill"></i>
                    </button>

                    ${puedeEditar ? `
                        <button class="btn btn-sm btn-outline-warning btn-editar-caso" data-id="${caso.id}" data-estado="${caso.estado}" title="Editar">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                    ` : ""}

                    ${puedeEliminar ? `
                        <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${caso.id}" data-estado="${caso.estado}" title="Eliminar">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    ` : ""}

                    ${puedeCerrar ? `
                        <button class="btn btn-sm btn-outline-secondary btn-cerrar" data-id="${caso.id}" data-estado="${caso.estado}" title="Cerrar">
                            <i class="bi bi-lock-fill"></i>
                        </button>
                    ` : ""}
                </div>
            </article>
        `;

            cardsContainer.innerHTML += card;
        });
    }
    function renderizarPaginacion(paginaActual, totalPaginas) {
        const paginacion = document.getElementById("paginacion");
        paginacion.innerHTML = "";

        if (totalPaginas <= 1) return;

        const crearItem = (label, page, disabled = false, active = false) => {
            const li = document.createElement("li");
            li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${page}">${label}</a>`;
            return li;
        };

        paginacion.appendChild(crearItem("Anterior", paginaActual - 1, paginaActual === 1));

        for (let i = 1; i <= totalPaginas; i++) {
            paginacion.appendChild(crearItem(i, i, false, i === paginaActual));
        }
        paginacion.appendChild(crearItem("Siguiente", paginaActual + 1, paginaActual === totalPaginas));
    }
    window.legalAppMetricas = {
        casos: {
            total: 0,
            pendientes: 0,
            enProceso: 0,
            cerrados: 0
        },
        usuarios: {
            total: 0,
            protegidos: 0,
            perfiles: 0
        },
        roles: {
            usuariosConPerfil: 0,
            asignaciones: 0,
            disponibles: 0
        }
    };

    window.recalcularMetricasUI = function () {
        const metricas = window.legalAppMetricas;

        // Dashboard principal
        const totalCasosEl = document.getElementById("totalCasos");
        const casosPendientesEl = document.getElementById("casosPendientes");
        const casosResueltosEl = document.getElementById("casosResueltos");
        const tasaCierreEl = document.getElementById("tasaCierre");

        const overviewTotalEl = document.getElementById("overviewTotal");
        const overviewPendientesEl = document.getElementById("overviewPendientes");
        const overviewCerradosEl = document.getElementById("overviewCerrados");

        const total = Number(metricas.casos.total ?? 0);
        const pendientes = Number(metricas.casos.pendientes ?? 0);
        const resueltos = Number(metricas.casos.cerrados ?? 0);
        const enProceso = Number(metricas.casos.enProceso ?? 0);

        const tasaCierre = total > 0
            ? `${Math.round((resueltos / total) * 100)}%`
            : "0%";

        if (totalCasosEl) totalCasosEl.textContent = total;
        if (casosPendientesEl) casosPendientesEl.textContent = pendientes;
        if (casosResueltosEl) casosResueltosEl.textContent = resueltos;
        if (tasaCierreEl) tasaCierreEl.textContent = tasaCierre;

        if (overviewTotalEl) overviewTotalEl.textContent = total;
        if (overviewPendientesEl) overviewPendientesEl.textContent = pendientes;
        if (overviewCerradosEl) overviewCerradosEl.textContent = resueltos;

        // Resumen módulo Casos
        const casosResumenTotalEl = document.getElementById("casosResumenTotal");
        const casosResumenPendientesEl = document.getElementById("casosResumenPendientes");
        const casosResumenCerradosEl = document.getElementById("casosResumenCerrados");

        if (casosResumenTotalEl) casosResumenTotalEl.textContent = total;
        if (casosResumenPendientesEl) casosResumenPendientesEl.textContent = pendientes;
        if (casosResumenCerradosEl) casosResumenCerradosEl.textContent = resueltos;

        // Gráfico resumen principal
        const chartPendientesValueEl = document.getElementById("chartPendientesValue");
        const chartEnProcesoValueEl = document.getElementById("chartEnProcesoValue");
        const chartCerradosValueEl = document.getElementById("chartCerradosValue");

        const chartPendientesBarEl = document.getElementById("chartPendientesBar");
        const chartEnProcesoBarEl = document.getElementById("chartEnProcesoBar");
        const chartCerradosBarEl = document.getElementById("chartCerradosBar");

        const totalGrafico = total > 0 ? total : 1;

        const pendientesPct = (pendientes / totalGrafico) * 100;
        const enProcesoPct = (enProceso / totalGrafico) * 100;
        const cerradosPct = (resueltos / totalGrafico) * 100;
        const insightEl = document.getElementById("insightText");
        const insightIcon = document.getElementById("insightIcon");

        if (insightIcon) {
            if (cerradosPct < 40) {
                insightIcon.textContent = "🔴";
            } else if (cerradosPct < 70) {
                insightIcon.textContent = "🟡";
            } else {
                insightIcon.textContent = "🟢";
            }
            const insightEl = document.getElementById("insightText");

            if (insightEl) {
                let mensaje = "";

                if (cerradosPct < 40) {
                    mensaje = `La tasa de resolución actual (${Math.round(cerradosPct)}%) se encuentra por debajo del umbral operativo esperado.
                Se observa acumulación de casos en seguimiento, lo que podría impactar la eficiencia del sistema.
                → Recomendación: priorizar la resolución de casos pendientes para optimizar el rendimiento operativo.`;
                }
                else if (cerradosPct >= 40 && cerradosPct < 70) {
                    mensaje = `El sistema mantiene una operación estable con una tasa de resolución del ${Math.round(cerradosPct)}%.

                → Existe margen de mejora en la gestión de casos en proceso para aumentar la eficiencia.`;
                }
                else {
                    mensaje = `El sistema presenta un nivel óptimo de eficiencia con una tasa de resolución del ${Math.round(cerradosPct)}%.

                → La operación se encuentra dentro de parámetros esperados.`;
                }
                insightEl.innerHTML = mensaje;
            }
        }

        const formatPct = (value) => Math.round(value);

        if (chartPendientesValueEl) {
            chartPendientesValueEl.textContent = `${pendientes} (${formatPct(pendientesPct)}%)`;
        }

        if (chartEnProcesoValueEl) {
            chartEnProcesoValueEl.textContent = `${enProceso} (${formatPct(enProcesoPct)}%)`;
        }

        if (chartCerradosValueEl) {
            chartCerradosValueEl.textContent = `${resueltos} (${formatPct(cerradosPct)}%)`;
        }

        if (chartPendientesBarEl) chartPendientesBarEl.style.width = `${pendientesPct}%`;
        if (chartEnProcesoBarEl) chartEnProcesoBarEl.style.width = `${enProcesoPct}%`;
        if (chartCerradosBarEl) chartCerradosBarEl.style.width = `${cerradosPct}%`;

      
        // Resumen módulo Usuarios
        const usuariosResumenTotalEl = document.getElementById("usuariosResumenTotal");
        const usuariosResumenProtegidosEl = document.getElementById("usuariosResumenProtegidos");
        const usuariosResumenPerfilesEl = document.getElementById("usuariosResumenPerfiles");

        if (usuariosResumenTotalEl) usuariosResumenTotalEl.textContent = metricas.usuarios.total ?? 0;
        if (usuariosResumenProtegidosEl) usuariosResumenProtegidosEl.textContent = metricas.usuarios.protegidos ?? 0;
        if (usuariosResumenPerfilesEl) usuariosResumenPerfilesEl.textContent = metricas.usuarios.perfiles ?? 0;

        // Resumen módulo Roles
        const rolesResumenUsuariosEl = document.getElementById("rolesResumenUsuarios");
        const rolesResumenAsignacionesEl = document.getElementById("rolesResumenAsignaciones");
        const rolesResumenDisponiblesEl = document.getElementById("rolesResumenDisponibles");

        if (rolesResumenUsuariosEl) rolesResumenUsuariosEl.textContent = metricas.roles.usuariosConPerfil ?? 0;
        if (rolesResumenAsignacionesEl) rolesResumenAsignacionesEl.textContent = metricas.roles.asignaciones ?? 0;
        if (rolesResumenDisponiblesEl) rolesResumenDisponiblesEl.textContent = metricas.roles.disponibles ?? 0;
    };
    function actualizarResumen(resumen) {
        const total = Number(resumen?.total ?? 0);
        const pendientes = Number(resumen?.pendientes ?? 0);
        const resueltos = Number(resumen?.resueltos ?? 0);
        const enProceso = Math.max(total - pendientes - resueltos, 0);

        window.legalAppMetricas.casos.total = total;
        window.legalAppMetricas.casos.pendientes = pendientes;
        window.legalAppMetricas.casos.enProceso = enProceso;
        window.legalAppMetricas.casos.cerrados = resueltos;

        window.recalcularMetricasUI?.();
    }
    /** Muestra totales y contadores en la parte superior del dashboard. */
    function mostrarMensajeInformativo(mostrados, total) {
        const estadoTabla = document.getElementById("contadorResultados");
        if (!estadoTabla) return;
        estadoTabla.textContent = `Mostrando ${mostrados} de ${total} casos`;
    }

    /** Mensaje inferior: “Mostrando X de Y casos”*/
    function mostrarDetalleCaso(id) {
        fetch(`${apiUrl}/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Error al obtener detalle");
                return res.json();
            })
            .then(data => {
                document.getElementById("detalle-titulo").innerText = data.titulo;
                document.getElementById("detalle-descripcion").innerText = data.descripcion;
                document.getElementById("detalle-estado").innerText = data.estado;
                document.getElementById("detalle-tipo").innerText = data.tipoCaso;
                document.getElementById("detalle-cliente").innerText = data.nombreCliente;
                document.getElementById("detalle-fecha").innerText = new Date(data.fechaCreacion).toLocaleDateString();

                 const grupoMotivo = document.getElementById("grupo-motivo-cierre");
                const motivoEl = document.getElementById("detalle-motivo-cierre");
                if (data.estado.toLowerCase() === "cerrado" && data.motivoCierre) {
                motivoEl.innerText = data.motivoCierre;
                grupoMotivo.classList.remove("d-none");
            } else {
                grupoMotivo.classList.add("d-none");
            }


                const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
                modal.show();
            })
            .catch(error => {
                console.error("Error al cargar detalle:", error);
                alert("No se pudo cargar el detalle del caso.");
            });
    }

    /* Trae los datos de un caso por ID.
Rellena un modal Bootstrap para mostrar info detallada */

    function getEstadoBadge(estado) {
        switch (estado.toLowerCase()) {
            case "pendiente":
                return '<span class="badge estado-pendiente">Pendiente</span>';
            case "enproceso":
                return '<span class="badge estado-enproceso">En Proceso</span>';
            case "cerrado":
                return '<span class="badge estado-cerrado">Cerrado</span>';
            default:
                return '<span class="badge bg-secondary badge-estado">' + estado + '</span>';
        }
    }

    /*Devuelven HTML para mostrar el estado y tipo con íconos y colores personalizados. */
    function getTipoIcono(tipo) {
        switch (tipo.toLowerCase()) {
            case "laboral":
                return '<i class="bi bi-people text-primary me-2"></i>';
            case "familia":
                return '<i class="bi bi-house-heart text-success me-2"></i>';
            case "civil":
                return '<i class="bi bi-bank text-info me-2"></i>';
            case "penal":
                return '<i class="bi bi-shield-exclamation text-danger me-2"></i>';
            default:
                return '<i class="bi bi-folder2-open text-secondary me-2"></i>';
        }
    }

    // Función reutilizable para mostrar errores claros al usuario
    async function mostrarErrorDesdeResponse(respuesta, mensajePorDefecto) {
        try {
            const errorJson = await respuesta.json();
            const mensaje = errorJson.detail || mensajePorDefecto;

            Swal.fire({
                icon: 'warning',
                title: 'Error',
                text: mensaje,
            });
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'Error inesperado',
                text: mensajePorDefecto,
            });
        }
    }
//  VALIDACIÓN INLINE (helpers)
function clearInvalid(form) {
  if (!form) return;
  form.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
  form.querySelectorAll(".invalid-feedback").forEach(fb => (fb.textContent = ""));
}

function setInvalid(inputEl, message) {
  if (!inputEl) return;
  inputEl.classList.add("is-invalid");
  const feedback = inputEl.closest(".mb-3")?.querySelector(".invalid-feedback");
  if (feedback) feedback.textContent = message;
}

function validateCasoForm() {
        const form = document.getElementById("formGestionCaso");
        const tituloEl = document.getElementById("form-titulo");
        const descEl = document.getElementById("form-descripcion");
        const tipoEl = document.getElementById("form-tipo");
        const clienteEl = document.getElementById("form-cliente");

        clearInvalid(form);

        const titulo = tituloEl.value.trim();
        const descripcion = descEl.value.trim();
        const tipoCaso = tipoEl.value;
        const clienteId = parseInt(clienteEl.value, 10);

        let ok = true;

        if (!titulo) {
            setInvalid(tituloEl, "Debes ingresar un título.");
            ok = false;
        } else if (titulo.length < 5 || titulo.length > 150) {
            setInvalid(tituloEl, "Debe tener entre 5 y 150 caracteres.");
            ok = false;
        }

        if (!descripcion) {
            setInvalid(descEl, "Debes ingresar una descripción.");
            ok = false;
        } else if (descripcion.length < 10) {
            setInvalid(descEl, "La descripción debe tener al menos 10 caracteres.");
            ok = false;
        } else if (descripcion.length > 5000) {
            setInvalid(descEl, "No puede superar 5000 caracteres.");
            ok = false;
        }

        if (!tipoCaso) {
            setInvalid(tipoEl, "Debes seleccionar un tipo de caso.");
            ok = false;
        }

        if (!Number.isInteger(clienteId) || clienteId < 1) {
            setInvalid(clienteEl, "Debes seleccionar un cliente válido.");
            ok = false;
        }

        return ok;
    }


    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("usuario_actual");
        sessionStorage.removeItem("demoContext");
        window.location.hash = "";
        window.location.href = "login.html";
    });

    // Limpia el token y usuario del almacenamiento, redirige al login. **/
    document.addEventListener("click", async (e) => {
        // Ver detalle

        if (e.target.closest(".btn-ver")) {
            const btn = e.target.closest(".btn-ver");
            const id = btn.dataset.id;
            mostrarDetalleCaso(id);
        }

        // EDITAR
    if (e.target.closest(".btn-outline-warning")) {
        const btn = e.target.closest(".btn-outline-warning, .btn-editar-caso");
        const row = btn.closest("tr");
        const card = btn.closest(".caso-card");

        const id = btn.dataset.id || row?.children[0]?.textContent;
        const estado = (
            btn.dataset.estado ||
            card?.dataset.estado ||
            row?.children[2]?.innerText ||
            ""
        ).trim().toLowerCase();

        if (estado === "cerrado") {
            Swal.fire({
                icon: "info",
                title: "No editable",
                text: "Este caso está cerrado y no puede ser modificado.",
            });
            return;
        }

          try {
    const res = await fetch(`${apiUrl}/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
        throw new Error("No se pudo obtener el caso");
    }

    const data = await res.json();
    // Inputs del formulario (OBLIGATORIO)
const tituloInput = document.getElementById("form-titulo");
const tipoSelect = document.getElementById("form-tipo");
const clienteSelect = document.getElementById("form-cliente");
const descripcionInput = document.getElementById("form-descripcion");

// Reset previo (muy importante)
[tituloInput, tipoSelect, clienteSelect, descripcionInput].forEach(el => {
    el.disabled = false;
});

   const rol = obtenerRolEfectivo(obtenerRolesDesdeJWT());

// Reset previo (importante)
[tituloInput, tipoSelect, clienteSelect, descripcionInput].forEach(el => {
    el.disabled = false;
});

//REGLAS SEGÚN ESTADO + ROL
if (rol === "Abogado") {

    // Cliente nunca editable por abogado
    clienteSelect.disabled = true;

    if (data.estado === "EnProceso") {
        tipoSelect.disabled = true;
        tituloInput.disabled = true; //NUEVO: título no editable en EnProceso
    }

    if (data.estado === "Cerrado") {
        tituloInput.disabled = true;
        tipoSelect.disabled = true;
        clienteSelect.disabled = true;
        descripcionInput.disabled = true;

        // Ocultar guardar
        document.querySelector("#formGestionCaso button[type='submit']")
            .style.display = "none";
    }
}
    document.getElementById("form-id").value = data.id;
    document.getElementById("form-titulo").value = data.titulo;
    document.getElementById("form-descripcion").value = data.descripcion;
    //cargar clientes ANTES de asignar valor
    await cargarClientes();
    //asignar SOLO el ID
    clienteSelect.value = data.clienteId;
    //no editable
    document.getElementById("grupo-cliente").style.display = "block";
// ESTADO (solo informativo)
const estadoSpan = document.getElementById("form-estado");
// Si viene Pendiente, visualmente pasa a EnProceso
const estadoVisual =
    data.estado === "Pendiente"
        ? "EnProceso"
        : data.estado;

estadoSpan.textContent = estadoVisual;
estadoSpan.className = "badge";

if (estadoVisual === "Pendiente") {
    estadoSpan.classList.add("estado-pendiente");
} else if (estadoVisual === "EnProceso") {
    estadoSpan.classList.add("estado-enproceso");
} else if (estadoVisual === "Cerrado") {
    estadoSpan.classList.add("estado-cerrado");
}

    // -------- TIPO --------
    document.getElementById("form-tipo").value = data.tipoCaso;
    document.getElementById("modalGestionCasoLabel").textContent = "✏️ Editar Caso";
    new bootstrap.Modal(document.getElementById("modalGestionCaso")).show();

} catch (err) {
    console.error("❌ Error al cargar caso:", err);
    Swal.fire("Error", "No se pudo cargar el caso", "error");
}
        }    
        // Eliminar con SweetAlert (esto va *fuera* del bloque de editar)
        if (e.target.closest(".btn-eliminar")) {
            const btn = e.target.closest(".btn-eliminar");
            const id = btn.dataset.id;

            const fila = btn.closest("tr");
            const card = btn.closest(".caso-card");

            const estado = (
                btn.dataset.estado ||
                card?.dataset.estado ||
                fila?.children[2]?.innerText ||
                ""
            ).trim().toLowerCase();

            if (estado === "cerrado") {
                Swal.fire({
                    icon: "warning",
                    title: "No se puede eliminar",
                    text: "Este caso está cerrado y no puede ser eliminado.",
                });
                return; // No seguimos con el fetch
            }

            // Confirmación visual
            Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción eliminará el caso permanentemente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Eliminando...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        const res = await fetch(`${apiUrl}/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });

                        if (!res.ok) {
                            const errorJson = await res.json();
                            const mensajeError = errorJson.detail || "Error inesperado";
                            // Mostrar mensaje personalizado según tipo de error
                            if (res.status === 400 || res.status === 404 || res.status === 409) {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'No se pudo eliminar',
                                    text: mensajeError,
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error inesperado',
                                    text: 'Ocurrió un problema al intentar eliminar el caso.',
                                });
                            }

                            return; // detenemos el flujo
                        }
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: 'Caso eliminado exitosamente',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true
                        });

                        await cargarCasosDesdeBackend();
                    } catch (error) {
                        Swal.fire('Error', error.message, 'error');
                    }
                }
            });
        }
        // Cerrar caso
        if (e.target.closest(".btn-cerrar")) {
            const btn = e.target.closest(".btn-cerrar");
            const id = btn.dataset.id;
            // Preguntar motivo de cierre
            const { value: motivo } = await Swal.fire({
                title: "Cerrar caso",
                input: "textarea",
                inputLabel: "Motivo del cierre (opcional)",
                inputPlaceholder: "Escribe el motivo si corresponde...",
                inputAttributes: {
                    "aria-label": "Motivo de cierre"
                },
                showCancelButton: true,
                confirmButtonText: "Cerrar caso",
                cancelButtonText: "Cancelar"
            });
            if (motivo === undefined) return; // Usuario canceló
            try {
                Swal.fire({
                    title: "Cerrando caso...",
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const res = await fetch(`${apiUrl}/${id}/cerrar`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ motivoCierre: motivo })
                });

                if (!res.ok) {
                    const errorJson = await res.json();
                    throw new Error(errorJson.detail || "Error inesperado");
                }

                await cargarCasosDesdeBackend();

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Caso cerrado con éxito',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });

            } catch (error) {
                console.error("Error al cerrar caso:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error al cerrar",
                    text: error.message || "No se pudo cerrar el caso."
                });
            }
        }
    });
      
    document.getElementById("btnNuevoCaso")?.addEventListener("click",async () => {

        // Limpiar el formulario antes de abrir
        // Limpiar opciones previas por si viene de modo edición

        document.getElementById("formGestionCaso").reset();
        //Reset visual de validaciones inline (paso 1)
clearInvalid(document.getElementById("formGestionCaso"));

//Asegurar que el botón Guardar siempre vuelva (fix submit oculto en edición Cerrado)
const submitBtn = document.querySelector('button[form="formGestionCaso"][type="submit"]');
if (submitBtn) {
    submitBtn.style.display = ""; // vuelve a mostrarse si estaba oculto
    submitBtn.disabled = false;   // por si quedó bloqueado
    submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Guardar Cambios';
}

// Asegurar que los campos vuelvan habilitados (nuevo caso = editable)
["form-titulo", "form-descripcion", "form-tipo", "form-cliente"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
});

        document.getElementById("form-id").value = ""; // dejar vacío para saber que es nuevo
        // Limpiar campo cliente (solo visual)
        document.getElementById("form-cliente").value = "";
              
   
            const clienteSelect = document.getElementById("form-cliente");
            clienteSelect.disabled = false;   
            clienteSelect.innerHTML = `<option value="">-- Seleccione cliente --</option>`;
            await cargarClientes();                   //  CLAVE, select, no readonly
        
        document.getElementById("grupo-cliente").style.display = "block"; // Mostrar campo
            // ESTADO VISUAL POR DEFECTO (NUEVO CASO)
        const estadoSpan = document.getElementById("form-estado");
        estadoSpan.textContent = "Pendiente";
        estadoSpan.className = "badge estado-pendiente";


        // Actualizar el título del modal
        document.getElementById("modalGestionCasoLabel").textContent = "📝 Nuevo Caso";
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById("modalGestionCaso"));
        modal.show();
    });

    document.getElementById("formGestionCaso")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        //  Loading state 
        const submitBtn = document.querySelector(
          'button[form="formGestionCaso"][type="submit"]'
        );

      if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Guardando...";
}
        // VALIDACIÓN INLINE
    if (!validateCasoForm()) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Guardar Cambios';
        return;
    }



        const id = document.getElementById("form-id").value.trim();
        const titulo = document.getElementById("form-titulo").value.trim();
        const descripcion = document.getElementById("form-descripcion").value.trim();
        const tipoCaso = document.getElementById("form-tipo").value;

        const clienteId = parseInt(
            document.getElementById("form-cliente").value,
            10
        );  

       
        const caso = {
            Titulo: titulo,
            Descripcion: descripcion,
            TipoCaso: tipoCaso,
            ClienteId: clienteId
        };

        const esNuevo = id === "";

        const url = esNuevo ? apiUrl : `${apiUrl}/${id}`;
        const metodo = esNuevo ? "POST" : "PUT";

            let response; 
            try {
    const response = await fetch(url, {
        method: metodo,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(caso)
    });

    if (!response.ok) {
        throw response; // ⬅️ NO lo parses aquí
    }

    //  ÉXITO
    bootstrap.Modal.getInstance(document.getElementById("modalGestionCaso")).hide();

    // Recarga la tabla
    await cargarCasosDesdeBackend();

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: esNuevo ? "Caso creado con éxito" : "Caso actualizado con éxito",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });

} catch (error) {
    console.error("❌ Error al guardar caso:", error);

    //  Error backend (viene como Response)
    if (error instanceof Response) {
        const msg = await mostrarErrorDesdeResponse(
            error,
            esNuevo
                ? "No se pudo crear el caso."
                : "No se pudo actualizar el caso."
        );

        //  REGLA DE NEGOCIO ESPECÍFICA (si el backend lo dice)
        if (msg && msg.toLowerCase().includes("cliente ya tiene")) {
            Swal.fire({
                icon: 'warning',
                title: 'No se puede cambiar el cliente',
                text: 'Este cliente ya tiene un caso activo. Para modificar el cliente debes ingresar como Administrador.',
            });
        }

    } else {
        // Error de conexión / JS
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: error.message || 'No se pudo conectar con el servidor.',
        });
    }

} finally {
    // 🔚 SIEMPRE restaurar botón (éxito o error)
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Guardar Cambios';
}
        
    });
});

// CONTROLADOR DE MÓDULOS (NUEVO)
const MODULOS = [
    'mod-dashboard',
    'mod-casos',
    'mod-usuarios',
    'mod-roles'
];
function mostrarModulo(id) {
    MODULOS.forEach(m => {
        const el = document.getElementById(m);
        if (el) {
            el.classList.add('d-none');
            el.classList.remove('modulo-entrando');
        }
    });

    const activo = document.getElementById(id);
    if (activo) {
        activo.classList.remove('d-none');

        // Reinicia animación de entrada del módulo
        void activo.offsetWidth;
        activo.classList.add('modulo-entrando');

        setTimeout(() => {
            activo.classList.remove('modulo-entrando');
        }, 700);
    }
}
// LOADER POR MÓDULO (PASO 1)
function onModuloCargado(moduloId) {
  switch (moduloId) {
    case "mod-casos":
      if (typeof cargarCasosDesdeBackend === "function") {
        cargarCasosDesdeBackend();
      }
      break;

    case "mod-usuarios":
      window.initUsuariosModule?.();
      break;

    case "mod-roles":
      window.refrescarUsuariosEnRoles?.();
      break;

  }
}
// SIDEBAR (UX / NAVEGACIÓN)
function isMobileViewport() {
    return window.innerWidth <= 1199.98;
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar) return;

    if (isMobileViewport()) {
        const willOpen = !sidebar.classList.contains("mobile-open");
        sidebar.classList.toggle("mobile-open", willOpen);
        overlay?.classList.toggle("show", willOpen);
        return;
    }

    sidebar.classList.toggle("collapsed");
}

function closeSidebarMobile() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar) return;

    sidebar?.classList.remove("mobile-open");
    overlay?.classList.remove("show");
}

window.addEventListener("resize", () => {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    if (window.innerWidth >= 1200) {
        closeSidebarMobile();
        sidebar.classList.remove("collapsed");
    } else {
        sidebar.classList.add("collapsed");
        sidebar.classList.remove("mobile-open");
    }
});

async function cargarClientes() {
    const response = await fetch("/api/Clientes", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    const clientes = await response.json();
    const select = document.getElementById("form-cliente");

    clientes.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;          // Id de la BD
        option.textContent = c.nombre; // Nombre visible
        select.appendChild(option);
    });
}

window.addEventListener("hashchange", () => {
    const hashModulo = (window.location.hash || "").replace("#", "").trim();

    if (!hashModulo) return;
    navigate(hashModulo);

});


function obtenerMetricasParaPDF() {
    const metricas = window.legalAppMetricas || {};
    const roles = obtenerRolesDesdeJWT();
    const rol = obtenerRolEfectivo(roles);
    const incluirGobernanza = rol === "Admin";

    const total = Number(metricas.casos?.total ?? 0);
    const pendientes = Number(metricas.casos?.pendientes ?? 0);
    const cerrados = Number(metricas.casos?.cerrados ?? 0);
    const enProceso = Number(metricas.casos?.enProceso ?? Math.max(total - pendientes - cerrados, 0));

    const usuariosTotal = Number(metricas.usuarios?.total ?? 0);
    const usuariosProtegidos = Number(metricas.usuarios?.protegidos ?? 0);
    const perfilesDistintos = Number(metricas.usuarios?.perfiles ?? 0);

    const usuariosConPerfil = Number(metricas.roles?.usuariosConPerfil ?? 0);
    const rolesAsignados = Number(metricas.roles?.asignaciones ?? 0);
    const rolesDisponibles = Number(metricas.roles?.disponibles ?? 0);

    const pct = (valor) => total > 0 ? Math.round((valor / total) * 100) : 0;
    const tasaCierre = pct(cerrados);
    const pctPendientes = pct(pendientes);
    const pctProceso = pct(enProceso);
    const pctCerrados = pct(cerrados);

    let estadoGeneral = "Sin operación registrada";
    if (total > 0 && tasaCierre >= 65) estadoGeneral = "Operación saludable";
    else if (total > 0 && tasaCierre >= 40) estadoGeneral = "Operación estable con foco";
    else if (total > 0) estadoGeneral = "Mantener monitoreo periódico";

    const fechaGeneracion = new Date().toLocaleString("es-CL", {
        dateStyle: "long",
        timeStyle: "short"
    });

    const resumen = total === 0
        ? "Actualmente no existen casos registrados en el sistema, por lo que el tablero aún no refleja carga operativa activa. El entorno se encuentra disponible para poblamiento y validación funcional."
        : `LegalApp registra ${total} casos en total. De ellos, ${pendientes} permanecen pendientes, ${enProceso} se encuentran en proceso y ${cerrados} ya fueron cerrados. La tasa de cierre actual alcanza ${tasaCierre}%, permitiendo evaluar el nivel de resolución operativa y la presión sobre la carga activa del entorno.`;

    let hallazgos = [];

    if (incluirGobernanza) {
        hallazgos = [
            total === 0
                ? "Aún no existe carga de casos suficiente para evaluar desempeño operativo."
                : `${pctPendientes}% del volumen total se mantiene pendiente, indicador clave para seguimiento y priorización operativa.`,
            usuariosTotal > 0
                ? `La base administrativa considera ${usuariosTotal} usuarios, con ${usuariosProtegidos} cuentas protegidas y ${perfilesDistintos} perfiles distintos registrados.`
                : "No se observan métricas de usuarios suficientemente pobladas en este momento.",
            rolesAsignados > 0
                ? `Existen ${rolesAsignados} asignaciones de rol sobre ${rolesDisponibles} roles disponibles, con ${usuariosConPerfil} usuarios vinculados a perfiles.`
                : "Las asignaciones de roles aún no muestran volumen suficiente para una lectura más profunda de gobernanza."
        ];
    } else {
        hallazgos = [
            total === 0
                ? "Aún no existe carga de casos suficiente para evaluar desempeño operativo."
                : `${pctPendientes}% del volumen total se mantiene pendiente, indicador clave para seguimiento y priorización operativa.`,
            total > 0
                ? `El porcentaje de cierre actual alcanza ${tasaCierre}%, permitiendo medir capacidad de resolución y estabilidad operativa.`
                : "Todavía no existe suficiente actividad para medir una tasa de cierre representativa.",
            enProceso > 0
                ? `${enProceso} casos permanecen en proceso, lo que exige seguimiento para evitar acumulación operativa.`
                : "La carga en proceso se mantiene contenida en este momento."
        ];
    }

    let recomendacion = "Mantener monitoreo periódico del dashboard y continuar poblamiento controlado para fortalecer trazabilidad, evidencia visual y lectura ejecutiva del entorno.";
    if (total > 0 && pctPendientes >= 45) {
        recomendacion = "Priorizar la reducción del backlog pendiente mediante seguimiento activo, reasignación operativa y revisión de tiempos de resolución para mejorar la percepción de control del servicio.";
    } else if (total > 0 && tasaCierre >= 65) {
        recomendacion = "El comportamiento operativo es favorable. Conviene consolidar este desempeño con evidencia periódica, continuidad del dato y refuerzo visual de la propuesta de valor frente a clientes.";
    }
    let mensajeClave = "La operación presenta visibilidad suficiente para toma de decisión ejecutiva.";
    let fortalezaClave = "La estructura de métricas permite monitorear carga, avance y capacidad de resolución.";
    let prioridadClave = "Mantener seguimiento periódico para sostener trazabilidad y lectura de desempeño.";

    if (total > 0 && tasaCierre < 40) {
        mensajeClave = "La operación requiere foco inmediato sobre backlog y capacidad de cierre.";
        fortalezaClave = "Existe visibilidad clara del volumen activo y del comportamiento por estado.";
        prioridadClave = "Reducir pendientes y acelerar cierres para mejorar percepción de control del servicio.";
    } else if (total > 0 && tasaCierre >= 65) {
        mensajeClave = "La operación muestra un comportamiento estable y una resolución saludable.";
        fortalezaClave = "La tasa de cierre confirma una dinámica de gestión favorable.";
        prioridadClave = "Consolidar este desempeño con monitoreo preventivo y continuidad del dato.";
    }
    return {
        total,
        pendientes,
        enProceso,
        cerrados,
        tasaCierre,
        pctPendientes,
        pctProceso,
        pctCerrados,
        usuariosTotal,
        usuariosProtegidos,
        perfilesDistintos,
        usuariosConPerfil,
        rolesAsignados,
        rolesDisponibles,
        fechaGeneracion,
        estadoGeneral,
        resumen,
        hallazgos,
        recomendacion,
        mensajeClave,
        fortalezaClave,
        prioridadClave,
        rol,
        incluirGobernanza
    };
}

    function crearNodoPDF(data) {
        const template = document.getElementById("pdf-report-template");

        if (!template) {
            throw new Error("No existe #pdf-report-template");
        }

        const reportNode = template.content.firstElementChild.cloneNode(true);

        const setText = (selector, value) => {
            const el = reportNode.querySelector(selector);
            if (el) el.textContent = value;
        };

        const setWidth = (selector, value) => {
            const el = reportNode.querySelector(selector);
            if (el) el.style.width = `${Math.max(0, Math.min(100, value))}%`;
        };

        setText('[data-pdf="fecha"]', data.fechaGeneracion);
        setText('[data-pdf="estadoGeneral"]', data.estadoGeneral);
        setText('[data-pdf="summary"]', data.resumen);

        setText('[data-pdf="total"]', data.total);
        setText('[data-pdf="pendientes"]', data.pendientes);
        setText('[data-pdf="proceso"]', data.enProceso);
        setText('[data-pdf="tasa"]', `${data.tasaCierre}%`);

        setText('[data-pdf="pendientesTexto"]', `${data.pendientes} (${data.pctPendientes}%)`);
        setText('[data-pdf="procesoTexto"]', `${data.enProceso} (${data.pctProceso}%)`);
        setText('[data-pdf="cerradosTexto"]', `${data.cerrados} (${data.pctCerrados}%)`);

        setWidth('[data-pdf="pendientesBar"]', data.pctPendientes);
        setWidth('[data-pdf="procesoBar"]', data.pctProceso);
        setWidth('[data-pdf="cerradosBar"]', data.pctCerrados);

        setText('[data-pdf="usuariosTotal"]', data.usuariosTotal);
        setText('[data-pdf="usuariosProtegidos"]', data.usuariosProtegidos);
        setText('[data-pdf="perfilesDistintos"]', data.perfilesDistintos);
        setText('[data-pdf="usuariosConPerfil"]', data.usuariosConPerfil);
        setText('[data-pdf="rolesAsignados"]', data.rolesAsignados);
        setText('[data-pdf="rolesDisponibles"]', data.rolesDisponibles);

        setText('[data-pdf="hallazgo1"]', data.hallazgos[0] || "");
        setText('[data-pdf="hallazgo2"]', data.hallazgos[1] || "");
        setText('[data-pdf="hallazgo3"]', data.hallazgos[2] || "");
        setText('[data-pdf="recomendacion"]', data.recomendacion);
        setText('[data-pdf="mensajeClave"]', data.mensajeClave);
        setText('[data-pdf="estadoGeneral2"]', data.estadoGeneral);
        setText('[data-pdf="fortalezaClave"]', data.fortalezaClave);
        setText('[data-pdf="prioridadClave"]', data.prioridadClave);

        if (!data.incluirGobernanza) {
            reportNode.querySelector("#pdf-section-gobernanza")?.remove();
        }

        reportNode.style.display = "block";
        reportNode.style.width = "720px";
        reportNode.style.minWidth = "720px";
        reportNode.style.maxWidth = "720px";
        reportNode.style.margin = "0";
        reportNode.style.height = "auto";
        reportNode.style.overflow = "visible";
        reportNode.style.background = "#ffffff";
        reportNode.style.position = "relative";
        reportNode.style.left = "0";
        reportNode.style.top = "0";
        reportNode.style.zIndex = "1";
        reportNode.style.pointerEvents = "none";
        reportNode.style.boxSizing = "border-box";

        reportNode.querySelectorAll("*").forEach(el => {
            el.style.transition = "none";
            el.style.animation = "none";
            el.style.transform = "none";
        });

        return reportNode;
    }
function setEstadoBotonPDF(btn, exportando) {
    if (!btn) return;

    if (exportando) {
        btn.disabled = true;
        btn.dataset.exporting = "true";
        btn.innerHTML = `<i class="bi bi-hourglass-split"></i> Generando PDF...`;
        return;
    }

    btn.disabled = false;
    btn.dataset.exporting = "false";
    btn.innerHTML = `<i class="bi bi-file-earmark-pdf"></i> Exportar Reporte`;
}

async function exportarReportePDF() {
    const btn = document.getElementById("btnExportPDF");
    if (!btn || btn.dataset.exporting === "true") return;

    const rol = obtenerRolEfectivo(obtenerRolesDesdeJWT());

    if (rol !== "Admin" && rol !== "Abogado") {
        throw new Error("No tienes permisos para exportar este reporte.");
    }

    let renderRoot = null;
    let reportNode = null;

    try {
        console.log("DEBUG PDF typeof:", typeof window.html2pdf);

        if (typeof window.html2pdf === "undefined") {
            throw new Error("html2pdf no está cargado");
        }

        setEstadoBotonPDF(btn, true);

        const data = obtenerMetricasParaPDF();
        reportNode = crearNodoPDF(data);
        renderRoot = document.createElement("div");
        renderRoot.id = "pdf-render-root";
        renderRoot.style.position = "fixed";
        renderRoot.style.left = "0";
        renderRoot.style.top = "0";
        renderRoot.style.width = "720px";
        renderRoot.style.padding = "0";
        renderRoot.style.margin = "0";
        renderRoot.style.opacity = "0.01";
        renderRoot.style.pointerEvents = "none";
        renderRoot.style.zIndex = "-1";
        renderRoot.style.background = "#ffffff";
        renderRoot.style.overflow = "visible";
        renderRoot.style.height = "auto";
        renderRoot.style.display = "block";
        renderRoot.style.boxSizing = "border-box";

        renderRoot.appendChild(reportNode);
        document.body.appendChild(renderRoot);

        await new Promise(resolve => setTimeout(resolve, 300));

        console.log("PDF size:", reportNode.offsetWidth, reportNode.offsetHeight);

        if (reportNode.offsetHeight === 0) {
            throw new Error("El nodo PDF quedó con altura 0 antes de exportar.");
        }

        const opciones = {
            margin: [8, 8, 8, 8],
            filename: `legalapp_reporte_operativo_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: 0,
                width: reportNode.offsetWidth || 720,
                height: reportNode.scrollHeight || reportNode.offsetHeight || 1123,
                windowWidth: reportNode.offsetWidth || 720,
                windowHeight: reportNode.scrollHeight || reportNode.offsetHeight || 1123
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },
            pagebreak: {
                mode: ["css", "legacy"]
            }
        };

        await window.html2pdf()
            .set(opciones)
            .from(reportNode)
            .save();

    } catch (error) {
        console.error("❌ Error exportando PDF:", error);

        if (window.Swal?.fire) {
            window.Swal.fire({
                icon: "error",
                title: "No fue posible generar el PDF",
                text: error?.message || "Ocurrió un problema durante la exportación."
            });
        } else {
            alert(error?.message || "Ocurrió un problema durante la exportación.");
        }
    } finally {
        if (renderRoot && renderRoot.parentNode) {
            renderRoot.parentNode.removeChild(renderRoot);
        }

        setEstadoBotonPDF(btn, false);
    }
}
function initPdfExport() {
    const btn = document.getElementById("btnExportPDF");

    if (!btn) {
        console.warn("⚠️ Botón PDF no encontrado");
        return;
    }

    if (btn.dataset.pdfReady === "true") return;

    btn.dataset.pdfReady = "true";
    btn.addEventListener("click", exportarReportePDF);
}

      
   



