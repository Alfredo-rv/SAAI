//! Build script para SAAI Core
//! 
//! Configuración de compilación y generación de código para
//! los nano-núcleos cuánticos.

use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configurar variables de entorno para la compilación
    println!("cargo:rerun-if-changed=proto/");
    println!("cargo:rerun-if-changed=build.rs");
    
    // Generar código de Protocol Buffers si existe el directorio
    let proto_dir = PathBuf::from("proto");
    if proto_dir.exists() {
        let proto_files: Vec<PathBuf> = std::fs::read_dir(&proto_dir)?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let path = entry.path();
                if path.extension()? == "proto" {
                    Some(path)
                } else {
                    None
                }
            })
            .collect();

        if !proto_files.is_empty() {
            tonic_build::configure()
                .build_server(true)
                .build_client(true)
                .out_dir("src/generated")
                .compile(&proto_files, &[proto_dir])?;
        }
    }
    
    // Configurar optimizaciones específicas del target
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    
    match target_arch.as_str() {
        "x86_64" => {
            println!("cargo:rustc-cfg=target_arch_x86_64");
            // Habilitar instrucciones SIMD si están disponibles
            if is_feature_available("avx2") {
                println!("cargo:rustc-cfg=feature=\"avx2\"");
            }
            if is_feature_available("sse4.2") {
                println!("cargo:rustc-cfg=feature=\"sse42\"");
            }
        }
        "aarch64" => {
            println!("cargo:rustc-cfg=target_arch_aarch64");
            // Configuraciones específicas para ARM64
            if is_feature_available("neon") {
                println!("cargo:rustc-cfg=feature=\"neon\"");
            }
        }
        _ => {}
    }
    
    match target_os.as_str() {
        "linux" => {
            println!("cargo:rustc-cfg=target_os_linux");
            // Habilitar características específicas de Linux
            println!("cargo:rustc-cfg=feature=\"epoll\"");
            println!("cargo:rustc-cfg=feature=\"io_uring\"");
            
            // Enlazar con bibliotecas del sistema necesarias
            println!("cargo:rustc-link-lib=pthread");
            println!("cargo:rustc-link-lib=dl");
        }
        "windows" => {
            println!("cargo:rustc-cfg=target_os_windows");
            // Configuraciones específicas de Windows
            println!("cargo:rustc-cfg=feature=\"iocp\"");
            
            // Enlazar con bibliotecas de Windows
            println!("cargo:rustc-link-lib=ws2_32");
            println!("cargo:rustc-link-lib=kernel32");
            println!("cargo:rustc-link-lib=user32");
        }
        "macos" => {
            println!("cargo:rustc-cfg=target_os_macos");
            // Configuraciones específicas de macOS
            println!("cargo:rustc-cfg=feature=\"kqueue\"");
            
            // Enlazar con frameworks de macOS
            println!("cargo:rustc-link-lib=framework=Foundation");
            println!("cargo:rustc-link-lib=framework=IOKit");
        }
        _ => {}
    }
    
    // Configurar optimizaciones de rendimiento
    if env::var("PROFILE").unwrap_or_default() == "release" {
        println!("cargo:rustc-cfg=feature=\"optimized\"");
        
        // Habilitar optimizaciones específicas para release
        println!("cargo:rustc-env=SAAI_OPTIMIZATION_LEVEL=3");
        println!("cargo:rustc-env=SAAI_ENABLE_LTO=true");
    } else {
        println!("cargo:rustc-env=SAAI_OPTIMIZATION_LEVEL=0");
        println!("cargo:rustc-env=SAAI_ENABLE_DEBUG=true");
    }
    
    // Generar información de build
    let build_timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let git_hash = get_git_hash().unwrap_or_else(|| "unknown".to_string());
    let rust_version = env::var("RUSTC_VERSION").unwrap_or_else(|_| "unknown".to_string());
    
    println!("cargo:rustc-env=SAAI_BUILD_TIMESTAMP={}", build_timestamp);
    println!("cargo:rustc-env=SAAI_GIT_HASH={}", git_hash);
    println!("cargo:rustc-env=SAAI_RUST_VERSION={}", rust_version);
    
    // Configurar características de seguridad
    if cfg!(feature = "security-hardening") {
        println!("cargo:rustc-cfg=feature=\"security_hardening\"");
        
        // Habilitar protecciones adicionales
        println!("cargo:rustc-link-arg=-Wl,-z,relro");
        println!("cargo:rustc-link-arg=-Wl,-z,now");
        println!("cargo:rustc-link-arg=-Wl,-z,noexecstack");
        
        // Stack canaries y ASLR
        println!("cargo:rustc-codegen-opt=-C force-frame-pointers=yes");
    }
    
    // Configurar características de observabilidad
    if cfg!(feature = "telemetry") {
        println!("cargo:rustc-cfg=feature=\"telemetry_enabled\"");
    }
    
    Ok(())
}

/// Verificar si una característica de CPU está disponible
fn is_feature_available(feature: &str) -> bool {
    // En una implementación real, esto verificaría las capacidades de CPU
    // Por ahora, asumimos que las características comunes están disponibles
    match feature {
        "avx2" | "sse4.2" => cfg!(target_arch = "x86_64"),
        "neon" => cfg!(target_arch = "aarch64"),
        _ => false,
    }
}

/// Obtener hash de Git del commit actual
fn get_git_hash() -> Option<String> {
    use std::process::Command;
    
    let output = Command::new("git")
        .args(&["rev-parse", "--short", "HEAD"])
        .output()
        .ok()?;
    
    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}