package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FolderPermissionRepository;
import eu.puhony.latex_editor.repository.ProjectFolderRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FolderPermissionServiceTest {

    @Mock private FolderPermissionRepository permissionRepository;
    @Mock private ProjectFolderRepository folderRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private FolderPermissionService service;

    private static final String BASE_PROJECT = "abc-123";
    private static final Long PROJECT_ID = 100L;

    private User owner;
    private User alice;
    private User bob;
    private ProjectFolder root;
    private ProjectFolder chapters;
    private ProjectFolder intro;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = makeUser(1L, "owner@x.com");
        alice = makeUser(2L, "alice@x.com");
        bob = makeUser(3L, "bob@x.com");

        project = new Project();
        project.setId(PROJECT_ID);
        project.setBaseProject(BASE_PROJECT);
        project.setOwner(owner);

        root = makeFolder(10L, "/", null);
        chapters = makeFolder(11L, "/chapters", root);
        intro = makeFolder(12L, "/chapters/intro", chapters);

        when(projectRepository.findByIdNonDeleted(eq(PROJECT_ID)))
                .thenReturn(Optional.of(project));
        when(folderRepository.findRoot(eq(PROJECT_ID))).thenReturn(Optional.of(root));
    }

    // --- Project owner has implicit MANAGER on every folder ---

    @Test
    void projectOwnerGetsImplicitManagerOnRoot() {
        assertEquals(FolderRole.MANAGER, service.effectiveRole(owner.getId(), root));
    }

    @Test
    void projectOwnerGetsImplicitManagerOnSubfolderEvenWithoutStoredGrants() {
        when(permissionRepository.findByFolderAndUser(anyLong(), eq(owner.getId()))).thenReturn(Optional.empty());
        assertEquals(FolderRole.MANAGER, service.effectiveRole(owner.getId(), intro));
    }

    @Test
    void projectOwnerCanManageEvenIfGrantsRepoIsEmpty() {
        assertTrue(service.canManage(owner.getId(), intro));
    }

    // --- Stored grants ---

    @Test
    void storedGrantOnFolderIsReturned() {
        stubGrant(chapters, alice, FolderRole.EDITOR);
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(chapters, alice, FolderRole.EDITOR)));

        assertEquals(FolderRole.EDITOR, service.effectiveRole(alice.getId(), chapters));
    }

    @Test
    void grantOnAncestorAppliesToDescendant() {
        stubGrant(chapters, alice, FolderRole.EDITOR);
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(chapters, alice, FolderRole.EDITOR)));

        assertEquals(FolderRole.EDITOR, service.effectiveRole(alice.getId(), intro));
    }

    @Test
    void multipleAncestorGrantsTakeMax() {
        stubGrant(chapters, alice, FolderRole.VIEWER);
        stubGrant(intro, alice, FolderRole.MANAGER);
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(
                        grant(chapters, alice, FolderRole.VIEWER),
                        grant(intro, alice, FolderRole.MANAGER)));

        assertEquals(FolderRole.MANAGER, service.effectiveRole(alice.getId(), intro));
    }

    @Test
    void noGrantsAnywhereReturnsNull() {
        when(permissionRepository.findByFolderAndUser(anyLong(), eq(bob.getId()))).thenReturn(Optional.empty());
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, bob.getId())).thenReturn(Collections.emptyList());

        assertNull(service.effectiveRole(bob.getId(), intro));
        assertFalse(service.canRead(bob.getId(), intro));
    }

    // --- Implicit root VIEWER ---

    @Test
    void userWithGrantOnSubfolderGetsImplicitViewerOnRoot() {
        when(permissionRepository.findByFolderAndUser(eq(root.getId()), eq(alice.getId()))).thenReturn(Optional.empty());
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(intro, alice, FolderRole.EDITOR)));

        assertEquals(FolderRole.VIEWER, service.effectiveRole(alice.getId(), root));
    }

    @Test
    void userWithNoGrantsGetsNoImplicitRootAccess() {
        when(permissionRepository.findByFolderAndUser(anyLong(), eq(bob.getId()))).thenReturn(Optional.empty());
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, bob.getId())).thenReturn(Collections.emptyList());

        assertNull(service.effectiveRole(bob.getId(), root));
    }

    // --- Permission check shortcuts ---

    @Test
    void canEditRequiresEditorOrAbove() {
        stubGrant(chapters, alice, FolderRole.VIEWER);
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(chapters, alice, FolderRole.VIEWER)));

        assertFalse(service.canEdit(alice.getId(), chapters));
        assertTrue(service.canRead(alice.getId(), chapters));
    }

    @Test
    void canManageRequiresManager() {
        stubGrant(chapters, alice, FolderRole.EDITOR);
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(chapters, alice, FolderRole.EDITOR)));

        assertFalse(service.canManage(alice.getId(), chapters));
        assertTrue(service.canEdit(alice.getId(), chapters));
    }

    // --- Grant flow ---

    @Test
    void grantThrowsIfActorIsNotManager() {
        when(permissionRepository.findByFolderAndUser(eq(chapters.getId()), eq(alice.getId())))
                .thenReturn(Optional.of(grant(chapters, alice, FolderRole.EDITOR)));
        when(permissionRepository.findByProjectIdAndUser(PROJECT_ID, alice.getId()))
                .thenReturn(List.of(grant(chapters, alice, FolderRole.EDITOR)));

        assertThrows(SecurityException.class,
                () -> service.grant(chapters, bob.getId(), FolderRole.VIEWER, alice.getId()));
        verify(permissionRepository, never()).save(any());
    }

    @Test
    void ownerCanGrantOnRoot() {
        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(permissionRepository.findByFolderAndUser(eq(root.getId()), eq(alice.getId()))).thenReturn(Optional.empty());
        when(permissionRepository.save(any(FolderPermission.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FolderPermission saved = service.grant(root, alice.getId(), FolderRole.EDITOR, owner.getId());

        assertNotNull(saved);
        assertEquals(FolderRole.EDITOR, saved.getRole());
        assertEquals(alice, saved.getUser());
    }

    // --- Helpers ---

    private void stubGrant(ProjectFolder folder, User user, FolderRole role) {
        when(permissionRepository.findByFolderAndUser(eq(folder.getId()), eq(user.getId())))
                .thenReturn(Optional.of(grant(folder, user, role)));
    }

    private FolderPermission grant(ProjectFolder folder, User user, FolderRole role) {
        FolderPermission p = new FolderPermission();
        p.setFolder(folder);
        p.setUser(user);
        p.setRole(role);
        return p;
    }

    private static User makeUser(long id, String email) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        return u;
    }

    private ProjectFolder makeFolder(long id, String path, ProjectFolder parent) {
        ProjectFolder f = new ProjectFolder();
        f.setId(id);
        f.setProject(project);
        f.setPath(path);
        f.setParent(parent);
        f.setName(parent == null ? "" : path.substring(path.lastIndexOf('/') + 1));
        return f;
    }
}
