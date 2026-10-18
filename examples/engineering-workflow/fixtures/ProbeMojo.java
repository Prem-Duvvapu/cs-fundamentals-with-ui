package fixture;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.project.MavenProject;
import java.net.URLClassLoader;

public final class ProbeMojo extends AbstractMojo {
    private MavenProject project;
    public void execute() throws MojoExecutionException {
        getLog().info("MODEL_VERSION=" + project.getVersion());
        for (var artifact : project.getArtifacts()) {
            if (artifact.getGroupId().equals("fixture") && artifact.getArtifactId().equals("codec")) {
                getLog().info("SELECTED_CODEC=" + artifact.getVersion());
                try (var loader = new URLClassLoader(new java.net.URL[]{artifact.getFile().toURI().toURL()}, ClassLoader.getPlatformClassLoader())) {
                    getLog().info("LOADED_CODEC=" + loader.loadClass("fixture.codec.Codec").getMethod("version").invoke(null));
                } catch (Exception failure) { throw new MojoExecutionException("Cannot load the actually resolved fixture codec", failure); }
            }
        }
    }
}
