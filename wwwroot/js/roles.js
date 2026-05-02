// ===========================
// 🔁 FUNCIONES AUXILIARES DE CARGA
// ===========================
let choicesUsuarios;
let choicesRoles;
const apiBase = "/api";

// =========================================================
// CAPA DEFENSIVA ROLES - ANTI CLIC / ANTI REQUEST PARALELA
// Objetivo: no cambiar el flujo actual; solo evitar acciones
// duplicadas cuando la API/BD esté lenta o haya clics rápidos.
// =========================================================
let cargarRolesAsignadosSecuencia = 0;
const accionesRolEnCurso = new Set();

function iniciarAccionRol(clave) {
    if (accionesRolEnCurso.has(clave)) return false;
    accionesRolEnCurso.add(clave);
    return true;
}

function finalizarAccionRol(clave) {
    accionesRolEnCurso.delete(clave);
}

function setBotonRolCargando(btn, cargando, htmlCargando = null) {
    if (!btn) return null;

    if (cargando) {
        const htmlOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add("disabled");
        btn.setAttribute("aria-busy", "true");

        if (htmlCargando) {
            btn.innerHTML = htmlCargando;
        }

        return htmlOriginal;
    }

    btn.disabled = false;
    btn.classList.remove("disabled");
    btn.removeAttribute("aria-busy");
    return null;
}

function actualizarMetricasRoles() {
    const selectUsuarios = document.getElementById("selectUsuarios");
    const selectRoles = document.getElementById("selectRoles");
    const listaRolesAsignados = document.getElementById("listaRolesAsignados");

    let usuariosConPerfil = 0;
    let asignaciones = 0;
    let disponibles = 0;

    if (selectUsuarios) {
        usuariosConPerfil = Array.from(selectUsuarios.options)
            .filter(option => option.value && option.value !== "")
            .length;
    }

if (listaRolesAsignados) {
    asignaciones = listaRolesAsignados.querySelectorAll(".rol-asignado-item").length;
}

    if (selectRoles) {
        disponibles = Array.from(selectRoles.options)
            .filter(option => option.value && option.value !== "")
            .length;
    }

    window.legalAppMetricas.roles.usuariosConPerfil = usuariosConPerfil;
    window.legalAppMetricas.roles.asignaciones = asignaciones;
    window.legalAppMetricas.roles.disponibles = disponibles;

    window.recalcularMetricasUI?.();
}

function resetearChoiceSingle(selectId, choicesInstance) {
    const select = document.getElementById(selectId);

    if (select) {
        select.value = "";
    }

    if (choicesInstance) {
        try {
            choicesInstance.removeActiveItems();
            choicesInstance.setChoiceByValue("");
        } catch (error) {
            console.warn(`No se pudo resetear Choices para ${selectId}:`, error);
        }
    }
}

function resetearEstadoRolesSinSeleccion() {
    // Invalida cualquier carga anterior de roles asignados que pudiera responder tarde.
    cargarRolesAsignadosSecuencia++;

    resetearChoiceSingle("selectUsuarios", choicesUsuarios);
    resetearChoiceSingle("selectRoles", choicesRoles);

    const lista = document.getElementById("listaRolesAsignados");

    if (lista) {
        lista.innerHTML = `
            <li class="list-group-item bg-transparent text-white-50">
                Selecciona un usuario para ver sus roles.
            </li>
        `;
    }

    actualizarMetricasRoles();
}

async function cargarUsuariosEnRoles() {
  const response = await fetch(`/api/usuarios?ts=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("jwt_token")}`
    }
  });
  const usuarios = await response.json();
  const select = document.getElementById("selectUsuarios");
  if (!select) return;
  // destruir Choices si ya existe
  if (choicesUsuarios) {
    choicesUsuarios.destroy();
    choicesUsuarios = null;
  }
  // limpiar y reconstruir el <select>
  select.innerHTML = "";
  // Placeholder inicial (sin selección)
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Seleccione un usuario";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    usuarios.forEach(u => {
        const option = document.createElement("option");
        option.value = u.id;
        option.textContent = u.esDemoProtegido ? `${u.nombre} (protegido)` : u.nombre;
        option.dataset.protegido = u.esDemoProtegido ? "true" : "false";
        select.appendChild(option);
    });
  // recrear Choices desde cero
  choicesUsuarios = new Choices(select, {
    searchEnabled: false,
    shouldSort: false,
    itemSelectText: "",
  });
    choicesUsuarios.setChoiceByValue("");
    // re-aplicar clase visual
    actualizarMetricasRoles();
}

window.refrescarUsuariosEnRoles = async function () {
    resetearEstadoRolesSinSeleccion();
    await cargarUsuariosEnRoles();
    resetearEstadoRolesSinSeleccion();
};


async function cargarRoles() {
    const res = await fetch(`${apiBase}/roles?ts=${Date.now()}`, {
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("jwt_token")}`
        }
    });

    if (!res.ok) {
        throw new Error("No se pudieron cargar los roles");
    }

    const roles = await res.json();
    const select = document.getElementById("selectRoles");
    if (!select) return;

    // Importante:
    // El combo de roles debe reconstruirse igual que el de usuarios.
    // Si queda como <select> nativo/default, el navegador o Choices default
    // puede mostrar el dropdown blanco que estás viendo.
    if (choicesRoles) {
        choicesRoles.destroy();
        choicesRoles = null;
    }

    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Seleccione un rol";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    roles.forEach(r => {
        const option = document.createElement("option");
        option.value = r.nombre;
        option.textContent = r.nombre;
        select.appendChild(option);
    });

    choicesRoles = new Choices(select, {
        searchEnabled: false,
        shouldSort: false,
        shouldSortItems: false,
        itemSelectText: "",
        allowHTML: false,
        placeholder: true,
        placeholderValue: "Seleccione un rol"
    });

    choicesRoles.setChoiceByValue("");
    actualizarMetricasRoles();
}

async function cargarRolesAsignados(usuarioId) {
    const secuenciaActual = ++cargarRolesAsignadosSecuencia;

    const lista = document.getElementById("listaRolesAsignados");
    if (!lista) return;

    lista.innerHTML = "";

    try {
        const res = await fetch(`${apiBase}/roles/${usuarioId}?ts=${Date.now()}`, {
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("jwt_token")}`
            }
        });

        let data = null;

        try {
            data = await res.json();
        } catch {
            data = null;
        }

        // Si el usuario cambió de selección mientras esta request estaba viva,
        // no pintamos una respuesta antigua encima de la nueva.
        if (secuenciaActual !== cargarRolesAsignadosSecuencia) return;

        const roles = Array.isArray(data) ? data : [];

        if (!res.ok && res.status !== 404) {
            const msg = data?.detail || data?.title || "No se pudieron cargar los roles asignados.";
            throw new Error(msg);
        }

        if (roles.length === 0) {
            lista.innerHTML = `
                <li class="list-group-item bg-transparent text-white-50">
                    Sin roles asignados
                </li>
            `;
            actualizarMetricasRoles();
            return;
        }

        roles.forEach(rol => {
            const nombre = rol?.nombre || rol?.Nombre || rol;
            if (!nombre) return;

            lista.appendChild(crearItemRolAsignado(nombre));
        });

        actualizarMetricasRoles();

    } catch (error) {
        if (secuenciaActual !== cargarRolesAsignadosSecuencia) return;

        console.error("Error al cargar roles asignados:", error);

        lista.innerHTML = `
            <li class="list-group-item bg-transparent text-warning">
                No fue posible cargar los roles asignados.
            </li>
        `;

        actualizarMetricasRoles();
    }
}

function crearItemRolAsignado(nombreRol) {
    const li = document.createElement("li");
    li.className = "list-group-item bg-transparent text-white d-flex justify-content-between align-items-center rol-asignado-item";
    li.dataset.rol = nombreRol;

    const span = document.createElement("span");
    span.textContent = nombreRol;

    const button = document.createElement("button");
    button.className = "btn btn-sm btn-outline-danger btn-quitar-rol";
    button.dataset.rol = nombreRol;
    button.title = "Quitar rol";
    button.type = "button";
    button.innerHTML = `<i class="bi bi-x-circle"></i>`;

    li.appendChild(span);
    li.appendChild(button);

    return li;
}

function quitarMensajeSinRoles(lista) {
    if (!lista) return;

    Array.from(lista.querySelectorAll("li")).forEach(item => {
        if (item.textContent.toLowerCase().includes("sin roles asignados")) {
            item.remove();
        }
    });
}

function mostrarMensajeSinRolesSiCorresponde(lista) {
    if (!lista) return;

    const itemsReales = lista.querySelectorAll(".rol-asignado-item");

    if (itemsReales.length === 0) {
        lista.innerHTML = `
            <li class="list-group-item bg-transparent text-white-50">
                Sin roles asignados
            </li>
        `;
    }
}

function agregarRolAsignadoEnUI(nombreRol) {
    const lista = document.getElementById("listaRolesAsignados");
    if (!lista || !nombreRol) return;

    quitarMensajeSinRoles(lista);

    const yaExiste = Array.from(lista.querySelectorAll(".rol-asignado-item"))
        .some(item => item.dataset.rol === nombreRol);

    if (yaExiste) {
        actualizarMetricasRoles();
        return;
    }

    lista.appendChild(crearItemRolAsignado(nombreRol));
    actualizarMetricasRoles();
}

function quitarRolAsignadoEnUI(nombreRol, botonOrigen = null) {
    const lista = document.getElementById("listaRolesAsignados");
    if (!lista || !nombreRol) return;

    const item = botonOrigen?.closest(".rol-asignado-item") ||
        Array.from(lista.querySelectorAll(".rol-asignado-item"))
            .find(item => item.dataset.rol === nombreRol);

    if (item) {
        item.remove();
    }

    mostrarMensajeSinRolesSiCorresponde(lista);
    actualizarMetricasRoles();
}

//  MÓDULO DE GESTIÓN DE ROLES
// Cargar roles asignados al cambiar usuario

document.getElementById("selectUsuarios")?.addEventListener("change", async (e) => {
    const usuarioId = e.target.value;

    if (usuarioId) {
        await cargarRolesAsignados(usuarioId);
        return;
    }

    resetearEstadoRolesSinSeleccion();
});


// ➕ Asignar rol
document.getElementById("btnAsignarRol")?.addEventListener("click", async () => {
    const btnAsignar = document.getElementById("btnAsignarRol");
    const selectUsuarios = document.getElementById("selectUsuarios");
    const selectRoles = document.getElementById("selectRoles");

    const usuarioId = selectUsuarios?.value;
    const nombreRol = selectRoles?.value;
    const usuarioSeleccionado = selectUsuarios?.options?.[selectUsuarios.selectedIndex];
    const esProtegido = usuarioSeleccionado?.dataset?.protegido === "true";

    if (esProtegido) {
        Swal.fire({
            icon: "info",
            title: "Usuario protegido",
            text: "Este usuario forma parte del entorno de demostración y no puede modificar sus roles."
        });
        return;
    }

    if (!usuarioId || !nombreRol) {
        Swal.fire({
            icon: "warning",
            title: "Campos requeridos",
            text: "Debes seleccionar un usuario y un rol.",
        });
        return;
    }

    const claveAccion = `asignar:${usuarioId}:${nombreRol}`;
    if (!iniciarAccionRol(claveAccion)) return;

    const htmlOriginal = setBotonRolCargando(
        btnAsignar,
        true,
        `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
         Asignando...`
    );

    try {
        const res = await fetch(`${apiBase}/roles/${usuarioId}/${nombreRol}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("jwt_token")}`
            }
        });

        if (!res.ok) {
            let err = "No se pudo asignar el rol.";

            try {
                const json = await res.json();
                err = json.detail || json.title || err;
            } catch {
                // Si no viene JSON, usamos mensaje por defecto.
            }

            if (res.status === 429) {
                err = "Demasiadas solicitudes. Espera unos segundos e intenta nuevamente.";
            }

            throw new Error(err);
        }

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Rol asignado correctamente',
            showConfirmButton: false,
            timer: 2000
        });

        agregarRolAsignadoEnUI(nombreRol);

    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message || "Error inesperado",
        });

    } finally {
        setBotonRolCargando(btnAsignar, false);
        if (htmlOriginal !== null) btnAsignar.innerHTML = htmlOriginal;

        finalizarAccionRol(claveAccion);
    }
});
// Quitar rol (debe ir FUERA del bloque de asignar)

    document.addEventListener("click", async (e) => {

        if (e.target.closest(".btn-quitar-rol")) {
            const btn = e.target.closest(".btn-quitar-rol");
            const rol = btn.dataset.rol;
            const usuarioId = document.getElementById("selectUsuarios").value;
            const selectUsuarios = document.getElementById("selectUsuarios");
            const usuarioSeleccionado = selectUsuarios?.options[selectUsuarios.selectedIndex];
            const esProtegido = usuarioSeleccionado?.dataset?.protegido === "true";

            if (esProtegido) {
                Swal.fire({
                    icon: "info",
                    title: "Usuario protegido",
                    text: "Este usuario forma parte del entorno de demostración y no puede modificar sus roles."
                });
                return;
            }

            if (!rol || !usuarioId) return;

            const confirmacion = await Swal.fire({
                title: `¿Quitar rol "${rol}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, quitar",
                cancelButtonText: "Cancelar"
            });

            if (!confirmacion.isConfirmed) return;

            try {
                const res = await fetch(`${apiBase}/roles/${usuarioId}/${rol}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("jwt_token")}`
                    }
                });

                if (!res.ok) {
                    let errorMsg = "Error al quitar rol";
                    try {
                        const json = await res.json();
                        errorMsg = json.detail || errorMsg;
                    } catch {
                        // no hacer nada, ya tenemos un mensaje por defecto
                    }
                    throw new Error(errorMsg);           }

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Rol eliminado correctamente',
                    showConfirmButton: false,
                    timer: 2000
                });

                quitarRolAsignadoEnUI(rol, btn);

            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: error.message || "No se pudo quitar el rol"
                
                });
            }
        }
    });
    /* VALIDAMOS si el usuario tiene multiples roles a la vez para saber que mostrar */
function verificarAccesoPorRol(rolesPermitidos = []) {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
        Swal.fire({
            icon: "error",
            title: "Sesión inválida",
            text: "Debes iniciar sesión.",
        }).then(() => {
            window.location.href = "login.html";
        });
        return false;
    }
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const rol = payload["role"] || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        const roles = Array.isArray(rol) ? rol : [rol];
        const tieneAcceso = roles.some(r => rolesPermitidos.includes(r));
        if (!tieneAcceso) {
            Swal.fire({
                icon: "error",
                title: "Acceso denegado",
                text: "No tienes permisos para acceder a esta sección.",
            }).then(() => {
                // 🔐 Limpieza para evitar loop infinito
                localStorage.removeItem("jwt_token");
                localStorage.removeItem("usuario_actual");
                window.location.href = "login.html";
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error al verificar el token:", error);
        Swal.fire({
            icon: "error",
            title: "Token inválido",
            text: "No se pudo verificar tu sesión.",
        }).then(() => {
            localStorage.clear();
            window.location.href = "login.html";
        });
        return false;
    }
}
// INICIALIZACIÓN AL CARGAR
window.initRolesModule = async function () {
    if (!verificarAccesoPorRol(["Admin"])) return;

    document.getElementById("seccion-gestion-roles")?.classList.remove("d-none");

    resetearEstadoRolesSinSeleccion();

    await cargarUsuariosEnRoles();
    await cargarRoles();

    resetearEstadoRolesSinSeleccion();
};